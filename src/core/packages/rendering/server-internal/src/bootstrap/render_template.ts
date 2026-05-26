/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface BootstrapTemplateData {
  colorMode: string;
  themeTagName: string;
  jsDependencyPaths: string[];
  publicPathMap: string;
  useHMR?: boolean;
  useRspack?: boolean;
}

export const renderTemplate = ({
  themeTagName,
  colorMode,
  jsDependencyPaths,
  publicPathMap,
  useHMR = false,
  useRspack = false,
}: BootstrapTemplateData) => {
  const kbnThemeTagTemplate =
    colorMode === 'system'
      ? `window.__kbnThemeTag__ = window.matchMedia('(prefers-color-scheme: dark)').matches ? '${themeTagName}dark' : '${themeTagName}light';`
      : `window.__kbnThemeTag__ = '${themeTagName}${colorMode}';`;

  // React Fast Refresh requires __REACT_DEVTOOLS_GLOBAL_HOOK__ to exist
  // BEFORE React-DOM loads so that the renderer calls hook.inject().
  // Without this stub, react-refresh/runtime (loaded later in kibana.bundle.js)
  // cannot capture the renderer and performReactRefresh() becomes a no-op.
  const reactDevtoolsHookStub = useHMR
    ? [
        '',
        "    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {",
        '      var __hmrNextId = 0;',
        '      __REACT_DEVTOOLS_GLOBAL_HOOK__ = {',
        '        renderers: new Map(),',
        '        supportsFiber: true,',
        '        inject: function(internals) {',
        '          var id = __hmrNextId++;',
        '          __REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.set(id, internals);',
        '          return id;',
        '        },',
        '        onScheduleFiberRoot: function() {},',
        '        onCommitFiberRoot: function() {},',
        '        onCommitFiberUnmount: function() {},',
        '      };',
        '    }',
        '',
      ].join('\n')
    : '';

  return `
function kbnBundlesLoader() {
  var modules = {};

  function has(prop) {
    return Object.prototype.hasOwnProperty.call(modules, prop);
  }

  function define(key, bundleRequire, bundleModuleKey) {
    if (has(key)) {
      throw new Error('__kbnBundles__ already has a module defined for "' + key + '"');
    }

    modules[key] = {
      bundleRequire,
      bundleModuleKey,
    };
  }

  function get(key) {
    if (!has(key)) {
      throw new Error('__kbnBundles__ does not have a module defined for "' + key + '"');
    }

    return modules[key].bundleRequire(modules[key].bundleModuleKey);
  }

  return { has: has, define: define, get: get };
}

var kbnCsp = JSON.parse(document.querySelector('kbn-csp').getAttribute('data'));
var kbnHardenPrototypes = JSON.parse(document.querySelector('kbn-prototype-hardening').getAttribute('data'));
window.__kbnHardenPrototypes__ = kbnHardenPrototypes.hardenPrototypes;
window.__kbnStrictCsp__ = kbnCsp.strictCsp;
${kbnThemeTagTemplate}
window.__kbnPublicPath__ = ${publicPathMap};
${useHMR ? 'window.__kbnHmrActive__ = true;' : ''}
window.__kbnBundles__ = kbnBundlesLoader();

if (window.__kbnStrictCsp__ && window.__kbnCspNotEnforced__) {
  var legacyBrowserError = document.getElementById('kbn_legacy_browser_error');
  legacyBrowserError.style.display = 'flex';
} else {
  if (!window.__kbnCspNotEnforced__ && window.console) {
    window.console.log("^ A single error about an inline script not firing due to content security policy is expected!");
  }
  var loadingMessage = document.getElementById('kbn_loading_message');
  loadingMessage.style.display = 'flex';

  // Allow a previous page to override the loading message text for the next
  // boot (e.g. "Switching to Nightshift mode..."). The override is consumed
  // once and cleared so a normal reload after that shows the default text.
  // When an override is present, also upgrade the loading visuals to match
  // EUI's animated <EuiLoadingElastic />: the static logo paths are animated
  // via the same keyframe (see @elastic/eui loading_elastic.styles.js) and
  // the bottom .kbnProgress bar is hidden, since the animated logo doubles
  // as the progress indicator.
  //
  // A companion 'kbn:loadingMode' key carries which mode is being entered;
  // it's used here to gate Nightshift-only decorations (the wave SVG at the
  // top) so they only appear on the way INTO Nightshift, not on the way out.
  try {
    var loadingOverride = sessionStorage.getItem('kbn:loadingMessageOverride');
    var loadingMode = sessionStorage.getItem('kbn:loadingMode');
    if (loadingOverride) {
      var welcomeText = loadingMessage.querySelector('.kbnWelcomeText');
      if (welcomeText) {
        welcomeText.textContent = loadingOverride;
      }
      var nightshiftWavesCss = loadingMode === 'nightshift'
        ? '#kbn_nightshift_waves {' +
          '  display: block !important;' +
          '  position: fixed;' +
          '  top: 0;' +
          '  left: 0;' +
          '  width: 100vw;' +
          '  pointer-events: none;' +
          '  z-index: 0;' +
          '  line-height: 0;' +
          // Slight translate to shift the artwork up + pull it left so the
          // wave crests are positioned the way Nightshift is designed.
          '  transform: translate(-180px, -40px);' +
          '}' +
          '#kbn_nightshift_waves svg {' +
          '  display: block;' +
          '  width: calc(100% + 360px);' +
          '  height: auto;' +
          '}'
        : '';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes kbnLoadingElasticOverride {' +
        '  0% { transform: scale3d(0.2, 0.2, -0.7); }' +
        '  40% { transform: scale3d(1, 1, 2); }' +
        '  50% { transform: scale3d(0.99, 0.99, 2); }' +
        '  70% { transform: scale3d(0.96, 0.96, -2.5); }' +
        '  100% { transform: scale3d(0.98, 0.98, 2); }' +
        '}' +
        '#kbn_loading_message .kbnLoaderWrap svg path {' +
        '  animation-name: kbnLoadingElasticOverride;' +
        '  animation-fill-mode: forwards;' +
        '  animation-direction: alternate;' +
        '  animation-duration: 1s;' +
        '  animation-timing-function: cubic-bezier(0, 0.63, 0.49, 1);' +
        '  animation-iteration-count: infinite;' +
        '  transform-origin: 50% 50%;' +
        '  transform-style: preserve-3d;' +
        '}' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(1) { animation-delay: 0s; }' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(2) { animation-delay: 0.035s; }' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(3) { animation-delay: 0.125s; }' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(4) { animation-delay: 0.155s; }' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(5) { animation-delay: 0.075s; }' +
        '#kbn_loading_message .kbnLoaderWrap svg path:nth-of-type(6) { animation-delay: 0.06s; }' +
        '#kbn_loading_message .kbnProgress { display: none !important; }' +
        nightshiftWavesCss +
        '@media (prefers-reduced-motion: reduce) {' +
        '  #kbn_loading_message .kbnLoaderWrap svg path { animation: none; }' +
        '}';
      document.head.appendChild(style);
      sessionStorage.removeItem('kbn:loadingMessageOverride');
      sessionStorage.removeItem('kbn:loadingMode');
    }
  } catch (e) {
    // sessionStorage can be unavailable (private mode, sandboxed iframes); ignore.
  }

  // Legacy: window.onload waits for ALL resources (fonts, favicons, images).
  // RSPack: IIFE executes immediately -- safe because this script is at the
  // bottom of <body> (DOM parsed) and <head> CSS is parser-blocking (loaded).
  // Avoids blocking on font/favicon downloads before starting bundle loads.
  ${useRspack ? '(function () {' : 'window.onload = function () {'}
    function failure() {
      // make subsequent calls to failure() noop
      failure = function () {};

      var errorTitle =  document.querySelector('[data-error-message-title]').dataset.errorMessageTitle;
      var errorText =  document.querySelector('[data-error-message-text]').dataset.errorMessageText;
      var errorReload =  document.querySelector('[data-error-message-reload]').dataset.errorMessageReload;

      var err = document.createElement('div');
      err.style.textAlign = 'center';
      err.style.padding = '120px 20px';
      err.style.fontFamily = 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif';

      var errorTitleEl = document.createElement('h1');
      errorTitleEl.innerText = errorTitle;
      errorTitleEl.style.margin = '20px';
      errorTitleEl.style.color = '#1a1c21';

      var errorTextEl = document.createElement('p');
      errorTextEl.innerText = errorText;
      errorTextEl.style.margin = '20px';
      errorTextEl.style.color = '#343741';

      var errorReloadEl = document.createElement('button');
      errorReloadEl.innerText = errorReload;
      errorReloadEl.onclick = function () {
        location.reload();
      };
      errorReloadEl.setAttribute('style',
       'cursor: pointer; padding-inline: 12px; block-size: 40px; font-size: 1rem; line-height: 1.4286rem; border-radius: 6px; min-inline-size: 112px; color: rgb(255, 255, 255); background-color: rgb(0, 119, 204); outline-color: rgb(0, 0, 0); border:none'
      );

      err.appendChild(errorTitleEl);
      err.appendChild(errorTextEl);
      err.appendChild(errorReloadEl);

      document.body.innerHTML = '';
      document.body.appendChild(err);
    }

    var stylesheetTarget = document.querySelector('head meta[name="add-styles-here"]')
    function loadStyleSheet(url, cb) {
      var dom = document.createElement('link');
      dom.rel = 'stylesheet';
      dom.type = 'text/css';
      dom.href = url;
      dom.addEventListener('error', failure);
      dom.addEventListener('load', cb);
      document.head.insertBefore(dom, stylesheetTarget);
    }

    var scriptsTarget = document.querySelector('head meta[name="add-scripts-here"]')
    function loadScript(url, cb) {
      var dom = document.createElement('script');
      dom.async = false;
      dom.src = url;
      dom.addEventListener('error', failure);
      dom.addEventListener('load', cb);
      document.head.insertBefore(dom, scriptsTarget);
    }

    function load(urls, cb) {
      var pending = urls.length;
      urls.forEach(function (url) {
        var innerCb = function () {
          pending = pending - 1;
          if (pending === 0 && typeof cb === 'function') {
            cb();
          }
        }

        if (typeof url !== 'string') {
          load(url, innerCb);
        } else if (url.slice(-4) === '.css') {
          loadStyleSheet(url, innerCb);
        } else {
          loadScript(url, innerCb);
        }
      });
    }
${reactDevtoolsHookStub}
    performance.mark('kbnLoad', {
      detail: 'load_started',
    })

    load([
      ${jsDependencyPaths.map((path) => `'${path}'`).join(',')}
    ], async function () {
      // RSPack progressive loading: wait for async plugin chunks to load
      if (window.__kbnPluginsLoaded) {
        await window.__kbnPluginsLoaded;
      }
      __kbnBundles__.get('entry/core/public').__kbnBootstrap__();
    });
  ${useRspack ? '})();' : '}'}
}
  `;
};
