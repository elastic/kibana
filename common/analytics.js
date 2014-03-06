define(function (require) {
  'use strict';
  var config = require('/kibana/config.js');

  window.GoogleAnalyticsObject = 'ga';

  // create an initali ga function. queue commands so it's executed
  // once the analytics.js loads.
  window.ga = window.ga || function () {
    (window.ga.q = window.ga.q || []).push(arguments);
  };

  // set the time as an interger for timmings
  window.ga.l = 1 * new Date();

  // create the async tag and inject it into the page.
  var asyncTag = document.createElement('script');
  var firstScript = document.getElementsByTagName('script')[0];
  asyncTag.async = 1;
  asyncTag.src = '//www.google-analytics.com/analytics.js';
  firstScript.parentNode.insertBefore(asyncTag, firstScript);

  // return the ga function
  window.ga('create', config.ga_tracking_code, 'auto');
  return {
    track: function () {
      window.ga.apply(null, Array.prototype.slice.call(arguments));
    },
    pageview: function () {
      window.ga('send', 'pageview', {
        cookieDomain: window.location.hostname,
        page: window.location.pathname+window.location.hash,
        location: window.location.href
      });
    }
  }
});
