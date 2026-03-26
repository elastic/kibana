/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
/* global __KBN_HMR_PORT__, __webpack_hash__ */

var lastHash;

function upToDate(hash) {
  if (hash) lastHash = hash;
  return lastHash === __webpack_hash__;
}

if (module.hot) {
  var source = new EventSource('http://localhost:' + __KBN_HMR_PORT__ + '/');

  source.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data);
      if (!data.hash) return;

      upToDate(data.hash);
      if (upToDate()) return;

      module.hot
        .check({ ignoreDeclined: true, ignoreUnaccepted: true })
        .then(function (updatedModules) {
          if (!updatedModules || updatedModules.length === 0) {
            console.log('[HMR] Nothing to update – reloading page');
            window.location.reload();
            return;
          }
          console.log('[HMR] Updated', updatedModules.length, 'module(s)');
          if (!upToDate()) {
            // Another update arrived while we were applying – check again
            module.hot.check({ ignoreDeclined: true, ignoreUnaccepted: true });
          }
        })
        .catch(function (err) {
          console.warn('[HMR] Update failed, reloading page:', err);
          window.location.reload();
        });
    } catch (e) {
      // ignore parse errors
    }
  };

  source.onerror = function () {
    // EventSource auto-reconnects; nothing to do
  };

  console.log('[HMR] Connected to SSE server on port ' + __KBN_HMR_PORT__);
}
