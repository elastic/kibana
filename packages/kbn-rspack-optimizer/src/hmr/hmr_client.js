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

var LOG_PREFIX = '[@kbn/rspack-optimizer][hmr]';
var lastHash;
var overlayElement = null;

function upToDate(hash) {
  if (hash) lastHash = hash;
  return lastHash === __webpack_hash__;
}

// --- Error overlay --------------------------------------------------------

var OVERLAY_ID = '__kbn_hmr_error_overlay__';

function showOverlay(errors) {
  hideOverlay();

  var backdrop = document.createElement('div');
  backdrop.id = OVERLAY_ID;
  backdrop.setAttribute('style', [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:rgba(0,0,0,0.85)',
    'overflow:hidden',
    'padding:50px 150px 150px',
    'box-sizing:border-box',
    'font-family:monospace',
    'font-size:13px',
    'color:#e8e8e8',
    'line-height:1.5',
    'display:flex',
    'flex-direction:column',
  ].join(';'));

  var header = document.createElement('div');
  header.setAttribute('style', [
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'margin-bottom:16px',
    'flex-shrink:0',
  ].join(';'));

  var title = document.createElement('span');
  title.setAttribute('style', 'font-size:18px;font-weight:bold;color:#ff6b6b');
  title.textContent = 'Build Error';

  var closeBtn = document.createElement('button');
  closeBtn.setAttribute('style', [
    'background:none',
    'border:1px solid #666',
    'border-radius:4px',
    'color:#ccc',
    'cursor:pointer',
    'font-size:14px',
    'padding:4px 12px',
    'font-family:inherit',
  ].join(';'));
  closeBtn.textContent = 'Dismiss (Esc)';
  closeBtn.onclick = hideOverlay;

  header.appendChild(title);
  header.appendChild(closeBtn);

  var body = document.createElement('pre');
  body.setAttribute('style', [
    'margin:0',
    'padding:16px',
    'background:#1e1e1e',
    'border-radius:6px',
    'border:1px solid #444',
    'overflow:auto',
    'white-space:pre',
    'word-break:normal',
    'box-sizing:border-box',
    'flex:1',
    'min-height:0',
  ].join(';'));
  body.textContent = errors.join('\n\n');

  backdrop.appendChild(header);
  backdrop.appendChild(body);
  document.body.appendChild(backdrop);

  overlayElement = backdrop;
}

function hideOverlay() {
  if (overlayElement) {
    overlayElement.parentNode.removeChild(overlayElement);
    overlayElement = null;
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape' && overlayElement) {
    hideOverlay();
  }
}

document.addEventListener('keydown', onKeyDown);

// --- HMR client -----------------------------------------------------------

if (module.hot) {
  var source = new EventSource('http://localhost:' + __KBN_HMR_PORT__ + '/');

  source.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data);

      if (data.errors && data.errors.length > 0) {
        console.error(LOG_PREFIX + ' Build failed with ' + data.errors.length + ' error(s)');
        showOverlay(data.errors);
        return;
      }

      if (!data.hash) return;

      hideOverlay();

      var lastTime = data.time;
      var lastFiles = data.files;

      upToDate(data.hash);
      if (upToDate()) return;

      module.hot
        .check({ ignoreDeclined: true, ignoreUnaccepted: true })
        .then(function (updatedModules) {
          if (!updatedModules || updatedModules.length === 0) {
            console.log(LOG_PREFIX + ' Nothing to update \u2013 reloading page');
            window.location.reload();
            return;
          }
          var fileLabel = lastFiles && lastFiles.length > 0
            ? lastFiles.map(function (f) { return f.split('/').pop(); }).join(', ')
            : '';
          var timeLabel = lastTime ? ' in ' + lastTime + 's' : '';
          var prefix = fileLabel ? fileLabel + ' \u2192 ' : '';
          console.log(LOG_PREFIX + ' ' + prefix + 'Updated ' + updatedModules.length + ' module(s)' + timeLabel);
          if (!upToDate()) {
            module.hot.check({ ignoreDeclined: true, ignoreUnaccepted: true });
          }
        })
        .catch(function (err) {
          console.warn(LOG_PREFIX + ' Update failed, reloading page:', err);
          window.location.reload();
        });
    } catch (e) {
      // ignore parse errors
    }
  };

  source.onerror = function () {
    // EventSource auto-reconnects; nothing to do
  };

  console.log(LOG_PREFIX + ' Connected on port ' + __KBN_HMR_PORT__);
}
