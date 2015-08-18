/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
