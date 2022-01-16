/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sha256 } from 'js-sha256'; // loaded here to reduce page load bundle size when FullStory is disabled

export const initializeFullStory = ({ basePath, orgId, packageInfo }) => {
  /* eslint-disable */
  window._fs_debug = false;
  window._fs_host = 'fullstory.com';
  window._fs_script = basePath.prepend(`/internal/cloud/${packageInfo.buildNum}/fullstory.js`);
  window._fs_org = orgId;
  window._fs_namespace = 'FSKibana';

  (function (m, n, e, t, l, o, g, y) {
    if (e in m) {
      if (m.console && m.console.log) {
        m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].');
      }
      return;
    }

    g = m[e] = function (a, b, s) {
      g.q ? g.q.push([a, b, s]) : g._api(a, b, s);
    };
    g.q = [];
    o = n.createElement(t);
    o.async = 1;
    o.crossOrigin = 'anonymous';
    o.src = _fs_script;
    y = n.getElementsByTagName(t)[0];
    y.parentNode.insertBefore(o, y);
    g.identify = function (i, v, s) {
      g(l, { uid: i }, s);
      if (v) g(l, v, s);
    };
    g.setUserVars = function (v, s) {
      g(l, v, s);
    };
    g.event = function (i, v, s) {
      g('event', { n: i, p: v }, s);
    };
    g.anonymize = function () {
      g.identify(!!0);
    };
    g.shutdown = function () {
      g('rec', !1);
    };
    g.restart = function () {
      g('rec', !0);
    };
    g.log = function (a, b) {
      g('log', [a, b]);
    };
    g.consent = function (a) {
      g('consent', !arguments.length || a);
    };
    g.identifyAccount = function (i, v) {
      o = 'account';
      v = v || {};
      v.acctId = i;
      g(o, v);
    };
    g.clearUserCookie = function () {};
    g.setVars = function (n, p) {
      g('setVars', [n, p]);
    };
    g._w = {};
    y = 'XMLHttpRequest';
    g._w[y] = m[y];
    y = 'fetch';
    g._w[y] = m[y];
    if (m[y])
      m[y] = function () {
        return g._w[y].apply(this, arguments);
      };
    g._v = '1.3.0';
  })(window, document, window._fs_namespace, 'script', 'user');

  const fullStory = window.FSKibana;

  /* eslint-enable */

  return {
    fullStory,
    sha256,
  };
};
