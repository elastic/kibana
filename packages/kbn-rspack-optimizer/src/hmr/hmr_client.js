/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console, no-var */
/* global __KBN_HMR_PORT__, __webpack_hash__ */

var LOG_PREFIX = '[@kbn/rspack-optimizer][hmr]';
var lastHash;
var overlayElement = null;
var lastErrors = null;

function upToDate(hash) {
  if (hash) lastHash = hash;
  // eslint-disable-next-line camelcase
  return lastHash === __webpack_hash__;
}

// --- Shadow DOM isolation --------------------------------------------------
// All HMR UI lives inside a shadow tree so that mouse/pointer events never
// leak to document listeners (e.g. EuiOutsideClickDetector) and DOM
// mutations inside the shadow tree are invisible to external observers.

var SHADOW_HOST_ID = '__kbn_hmr_root__';
var shadowHost = null;
var shadowRootRef = null;
var fenceElement = null;
var hostObserver = null;

function ensureShadowRoot() {
  if (shadowRootRef) return shadowRootRef;

  shadowHost = document.createElement('div');
  shadowHost.id = SHADOW_HOST_ID;
  shadowHost.setAttribute(
    'style',
    [
      'position:fixed',
      'top:0',
      'left:0',
      'width:0',
      'height:0',
      'overflow:visible',
      'z-index:2147483647',
      'pointer-events:none',
    ].join(';')
  );

  shadowRootRef = shadowHost.attachShadow({ mode: 'open' });

  // Bubble-phase event fence: stops mouse/pointer events after internal
  // handlers (onclick, etc.) have executed but before they retarget to
  // the shadow host and reach document (EuiOutsideClickDetector).
  fenceElement = document.createElement('div');
  fenceElement.setAttribute('style', 'display:contents');
  ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(function (evt) {
    fenceElement.addEventListener(evt, function (e) {
      e.stopPropagation();
    });
  });
  shadowRootRef.appendChild(fenceElement);

  document.body.appendChild(shadowHost);
  observeShadowHost();
  return shadowRootRef;
}

function getShadowContainer() {
  ensureShadowRoot();
  return fenceElement;
}

function observeShadowHost() {
  if (hostObserver) return;
  hostObserver = new MutationObserver(function () {
    if (shadowHost && !shadowHost.isConnected && document.body) {
      hostObserver.disconnect();
      document.body.appendChild(shadowHost);
      hostObserver.observe(document.body, { childList: true });
    }
  });
  hostObserver.observe(document.body, { childList: true });
}

// --- Status indicator ------------------------------------------------------

var INDICATOR_ID = '__kbn_hmr_indicator__';
var indicatorElement = null;
var indicatorDot = null;
var indicatorLabel = null;
var indicatorState = 'idle';
var updateFlashTimeout = null;

var STATE_CONFIG = {
  idle: { color: '#4caf50', text: 'HMR: Connected', animation: 'none' },
  building: {
    color: '#ff9800',
    text: 'HMR: Building...',
    animation: 'kbnHmrPulse 1.2s ease-in-out infinite',
  },
  updated: { color: '#4caf50', text: 'HMR: Updated', animation: 'kbnHmrFlash 0.6s ease-out' },
  error: { color: '#f44336', text: 'HMR: Error', animation: 'kbnHmrBounce 0.4s ease-out' },
  disconnected: { color: '#888', text: 'HMR: Disconnected', animation: 'none' },
};

function injectIndicatorStyles() {
  var root = ensureShadowRoot();
  if (root.getElementById && root.getElementById(INDICATOR_ID + '_styles')) return;
  // Shadow roots may not have getElementById; check by querying
  if (root.querySelector && root.querySelector('#' + INDICATOR_ID + '_styles')) return;

  var style = document.createElement('style');
  style.id = INDICATOR_ID + '_styles';
  style.textContent = [
    '@keyframes kbnHmrPulse {',
    '  0%, 100% { opacity: 1; }',
    '  50% { opacity: 0.4; }',
    '}',
    '@keyframes kbnHmrFlash {',
    '  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }',
    '  70% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }',
    '  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }',
    '}',
    '@keyframes kbnHmrBounce {',
    '  0% { transform: scale(1); }',
    '  30% { transform: scale(1.4); }',
    '  100% { transform: scale(1); }',
    '}',
    '#' + INDICATOR_ID + ' {',
    '  width: 14px;',
    '  padding: 0 2px;',
    '}',
    '#' + INDICATOR_ID + ':hover {',
    '  width: 150px;',
    '  padding: 0 10px 0 8px;',
    '}',
    '#' + INDICATOR_ID + ' .' + INDICATOR_ID + '_label {',
    '  opacity: 0;',
    '  max-width: 0;',
    '  transition: opacity 0.15s ease 0.05s, max-width 0.25s ease;',
    '  overflow: hidden;',
    '}',
    '#' + INDICATOR_ID + ':hover .' + INDICATOR_ID + '_label {',
    '  opacity: 1;',
    '  max-width: 120px;',
    '}',
  ].join('\n');
  // Append style directly to shadow root (not fence) for correct scoping
  root.appendChild(style);
}

function createIndicator() {
  if (indicatorElement) return;
  injectIndicatorStyles();

  var container = document.createElement('div');
  container.id = INDICATOR_ID;
  container.setAttribute(
    'style',
    [
      'position:fixed',
      'bottom:16px',
      'right:16px',
      'height:28px',
      'border-radius:14px',
      'background:rgba(30,30,30,0.85)',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'gap:6px',
      'cursor:default',
      'pointer-events:auto',
      'overflow:hidden',
      'transition:width 0.25s ease, padding 0.25s ease',
      'box-sizing:border-box',
    ].join(';')
  );

  var dot = document.createElement('span');
  dot.setAttribute(
    'style',
    [
      'width:10px',
      'height:10px',
      'border-radius:50%',
      'flex-shrink:0',
      'transition:background 0.3s ease',
      'background:#4caf50',
    ].join(';')
  );

  var label = document.createElement('span');
  label.className = INDICATOR_ID + '_label';
  label.setAttribute(
    'style',
    [
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      'font-size:11px',
      'color:#ccc',
      'white-space:nowrap',
      'line-height:1',
      'user-select:none',
    ].join(';')
  );
  label.textContent = 'HMR: Connected';

  container.onclick = function () {
    if (lastErrors && lastErrors.length > 0) {
      showOverlay(lastErrors);
    }
  };

  container.appendChild(dot);
  container.appendChild(label);
  getShadowContainer().appendChild(container);

  indicatorElement = container;
  indicatorDot = dot;
  indicatorLabel = label;

  applyIndicatorState();
}

function ensureIndicatorAttached() {
  if (indicatorElement && !indicatorElement.isConnected) {
    indicatorElement = null;
    indicatorDot = null;
    indicatorLabel = null;
  }
  if (!indicatorElement && document.body) {
    createIndicator();
  }
}

function applyIndicatorState() {
  if (!indicatorElement || !indicatorDot || !indicatorLabel) return;

  var cfg = STATE_CONFIG[indicatorState] || STATE_CONFIG.idle;
  indicatorDot.style.background = cfg.color;
  indicatorDot.style.animation = cfg.animation;
  indicatorLabel.textContent = cfg.text;
  indicatorElement.title = cfg.text;
  indicatorElement.style.cursor = lastErrors && lastErrors.length > 0 ? 'pointer' : 'default';
}

function setIndicatorState(state) {
  ensureIndicatorAttached();
  if (indicatorState === state) return;
  indicatorState = state;

  if (updateFlashTimeout) {
    clearTimeout(updateFlashTimeout);
    updateFlashTimeout = null;
  }

  applyIndicatorState();

  if (state === 'updated') {
    updateFlashTimeout = setTimeout(function () {
      if (indicatorState === 'updated') {
        setIndicatorState('idle');
      }
    }, 1500);
  }
}

// --- Error overlay --------------------------------------------------------

var OVERLAY_ID = '__kbn_hmr_error_overlay__';

function showOverlay(errors) {
  lastErrors = errors;
  hideOverlay();

  var backdrop = document.createElement('div');
  backdrop.id = OVERLAY_ID;
  backdrop.setAttribute(
    'style',
    [
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
      'pointer-events:auto',
    ].join(';')
  );

  var header = document.createElement('div');
  header.setAttribute(
    'style',
    [
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'margin-bottom:16px',
      'flex-shrink:0',
    ].join(';')
  );

  var title = document.createElement('span');
  title.setAttribute('style', 'font-size:18px;font-weight:bold;color:#ff6b6b');
  title.textContent = 'Build Error';

  var closeBtn = document.createElement('button');
  closeBtn.setAttribute(
    'style',
    [
      'background:none',
      'border:1px solid #666',
      'border-radius:4px',
      'color:#ccc',
      'cursor:pointer',
      'font-size:14px',
      'padding:4px 12px',
      'font-family:inherit',
    ].join(';')
  );
  closeBtn.textContent = 'Dismiss (Esc)';
  closeBtn.onclick = hideOverlay;

  header.appendChild(title);
  header.appendChild(closeBtn);

  var body = document.createElement('pre');
  body.setAttribute(
    'style',
    [
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
    ].join(';')
  );
  body.textContent = errors.join('\n\n');

  backdrop.appendChild(header);
  backdrop.appendChild(body);
  getShadowContainer().appendChild(backdrop);

  // Enable pointer-events on the host so the full-screen overlay receives clicks
  if (shadowHost) {
    shadowHost.style.pointerEvents = 'auto';
  }

  overlayElement = backdrop;
}

function hideOverlay() {
  if (overlayElement) {
    if (overlayElement.isConnected) {
      overlayElement.parentNode.removeChild(overlayElement);
    }
    overlayElement = null;
  }
  // Revert pointer-events so the host doesn't intercept app clicks
  if (shadowHost) {
    shadowHost.style.pointerEvents = 'none';
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
  var RECONNECT_INITIAL = 1000;
  var RECONNECT_MAX = 12000;
  var reconnectDelay = RECONNECT_INITIAL;
  var reconnectTimer = null;
  var source = null;
  var wasDisconnected = false;

  function reloadWithBasePath(serverBasePath) {
    if (serverBasePath) {
      var currentBasePath = '/' + window.location.pathname.split('/')[1];
      if (currentBasePath !== serverBasePath) {
        var rest = window.location.pathname.slice(currentBasePath.length);
        var newUrl = serverBasePath + rest + window.location.search + window.location.hash;
        console.log(
          LOG_PREFIX +
            ' Base path changed from ' +
            currentBasePath +
            ' to ' +
            serverBasePath +
            ', redirecting...'
        );
        window.location.href = newUrl;
        return;
      }
    }
    console.log(LOG_PREFIX + ' Server restarted, reloading page...');
    window.location.reload();
  }

  function connect() {
    source = new EventSource('http://localhost:' + __KBN_HMR_PORT__ + '/');

    source.onmessage = function (event) {
      reconnectDelay = RECONNECT_INITIAL;
      try {
        var data = JSON.parse(event.data);

        if (data.basePath !== undefined) {
          if (wasDisconnected) {
            reloadWithBasePath(data.basePath);
          }
          return;
        }

        if (data.building) {
          setIndicatorState('building');
          return;
        }

        if (data.errors && data.errors.length > 0) {
          console.error(LOG_PREFIX + ' Build failed with ' + data.errors.length + ' error(s)');
          if (!data.replay) {
            showOverlay(data.errors);
          } else {
            lastErrors = data.errors;
          }
          setIndicatorState('error');
          return;
        }

        if (!data.hash) return;

        hideOverlay();
        lastErrors = null;
        setIndicatorState('updated');

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
            var fileLabel =
              lastFiles && lastFiles.length > 0
                ? lastFiles
                    .map(function (f) {
                      return f.split('/').pop();
                    })
                    .join(', ')
                : '';
            var timeLabel = lastTime ? ' in ' + lastTime + 's' : '';
            var prefix = fileLabel ? fileLabel + ' \u2192 ' : '';
            var moduleCount =
              updatedModules.length > 1
                ? ' (' + updatedModules.length + ' modules re-evaluated)'
                : '';
            console.log(LOG_PREFIX + ' ' + prefix + 'Updated' + timeLabel + moduleCount);
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
      source.close();
      source = null;
      wasDisconnected = true;
      setIndicatorState('disconnected');
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
  }

  // Create indicator once DOM is ready
  if (document.body) {
    createIndicator();
  } else {
    document.addEventListener('DOMContentLoaded', createIndicator);
  }

  connect();
  console.log(LOG_PREFIX + ' Connected on port ' + __KBN_HMR_PORT__);
}
