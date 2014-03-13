define(function (require) {
  'use strict';
  var loaded = false;

  window.GoogleAnalyticsObject = 'ga';

  // create an initial ga function. queue commands so it's executed
  // once the analytics.js loads.
  window.ga = window.ga || function () {
    (window.ga.q = window.ga.q || []).push(arguments);
  };

  // set the time as an interger for timmings
  window.ga.l = 1 * new Date();

  // create the async tag and inject it into the page.
  function load () {
    if (loaded) {
      return void 0;
    }
    var asyncTag = document.createElement('script');
    var firstScript = document.getElementsByTagName('script')[0];
    asyncTag.async = 1;
    asyncTag.src = '//www.google-analytics.com/analytics.js';
    firstScript.parentNode.insertBefore(asyncTag, firstScript);
    loaded = true;
  }

  // return the ga function
  window.ga('create', '@@ga_tracking_code', 'auto');
  return {
    track: function () {
      load();
      window.ga.apply(null, Array.prototype.slice.call(arguments));
    },
    pageview: function () {
      load();
      var options = {
        cookieDomain: window.location.hostname,
        page: window.location.pathname+window.location.hash.replace(/\?.+$/, ''),
        location: window.location.href,
        dimension1: '@@MARVEL_REVISION'
      };
      window.ga('send', 'pageview', options);
    }
  };
});
