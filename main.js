/* Zestia — main.js (IIFE, sin módulos) */
(function () {
  'use strict';

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.warn('[zestia] ' + name + ' falló:', e); }
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var parent = el.parentElement;
          var siblings = parent ? parent.querySelectorAll(':scope > .reveal') : [];
          var idx = Array.prototype.indexOf.call(siblings, el);
          el.style.transitionDelay = (Math.max(idx, 0) % 6) * 70 + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });

    // Hero: entrada escalonada inmediata
    var heroTitle = document.querySelectorAll('.hero__title .reveal');
    heroTitle.forEach(function (el, i) {
      el.style.transitionDelay = (120 + i * 130) + 'ms';
      requestAnimationFrame(function () { el.classList.add('is-in'); });
    });

    // Red de seguridad: a los 6 s todo visible
    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.5) el.classList.add('is-in');
      });
    }, 6000);
  }

  /* ---------- Nav ---------- */
  function initNav() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!nav) return;

    function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 30); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });
    }
  }

  /* ---------- Contador ---------- */
  function countUp(el) {
    if (el.dataset.done) return;
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    el.dataset.done = '1';
    var dur = 1300, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(1).replace('.', ',');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var first = document.querySelector('.panel.is-active [data-count]');
    if (!first || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.05 });
    io.observe(first);
  }

  /* ---------- Tabs de deportes ---------- */
  function initTabs() {
    var tablist = document.querySelector('.tabs');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('.tab'));
    var ink = tablist.querySelector('.tabs__ink');

    function moveInk(tab) {
      if (!ink) return;
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    }

    function activate(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.classList.toggle('is-active', on);
      });
      moveInk(tab);
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      var num = panel && panel.querySelector('[data-count]');
      if (num) { num.dataset.done = ''; countUp(num); }
    }

    tabs.forEach(function (tab, i) {
      tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
      tab.addEventListener('click', function () { activate(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activate(next, true); }
      });
    });

    var current = tablist.querySelector('.tab.is-active') || tabs[0];
    moveInk(current);
    window.addEventListener('resize', function () {
      moveInk(tablist.querySelector('.tab.is-active') || tabs[0]);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveInk(tablist.querySelector('.tab.is-active') || tabs[0]); });
    }

    // Si un enlace "Dónde encontrarlo" apunta a un local filtrado, mostrarlo
    document.querySelectorAll('.where a[href^="#local-"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var all = document.querySelector('.chip[data-filter="all"]');
        if (all) all.click();
      });
    });
  }

  /* ---------- Filtros de locales ---------- */
  function initFilters() {
    var chips = document.querySelectorAll('.chip');
    var places = document.querySelectorAll('.place');
    var empty = document.getElementById('placesEmpty');
    if (!chips.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var visible = 0;
        places.forEach(function (p) {
          var tags = (p.getAttribute('data-tags') || '').split(' ');
          var show = f === 'all' || tags.indexOf(f) !== -1;
          p.classList.toggle('is-hidden', !show);
          if (show) visible++;
        });
        if (empty) empty.hidden = visible !== 0;
      });
    });
  }

  function boot() {
    safe(initNav, 'nav');
    safe(initReveal, 'reveal');
    safe(initTabs, 'tabs');
    safe(initCounters, 'counters');
    safe(initFilters, 'filters');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
