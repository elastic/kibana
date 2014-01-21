define([], function () {
  'use strict';

  /* google analytics */
  var _gaq = window._gaq = (window._gaq || []);
  _gaq.push(['_setAccount', 'UA-11830182-16']);
  _gaq.push(['_setCustomVar', 1, 'Version', SENSE_VERSION, 1]);
  _gaq.push(['_trackPageview']);

  (function () {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
  })();

  return _gaq
});