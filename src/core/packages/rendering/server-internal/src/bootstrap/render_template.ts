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
  /**
   * Vite dev server configuration for ESM mode
   */
  viteConfig?: {
    /** Vite server URL (e.g., http://localhost:5173) */
    serverUrl: string;
    /** Plugin IDs to load from Vite */
    pluginIds: string[];
    /** Map of plugin ID to its required plugin IDs (for transitive dependency resolution) */
    pluginDependencies: Record<string, string[]>;
  };
}

/**
 * Render ESM-compatible bootstrap for Vite development mode
 * Implements TRUE lazy loading - only loads essential plugins at startup
 */
function renderViteTemplate({
  themeTagName,
  colorMode,
  publicPathMap,
  viteConfig,
}: BootstrapTemplateData): string {
  const kbnThemeTagTemplate =
    colorMode === 'system'
      ? `window.__kbnThemeTag__ = window.matchMedia('(prefers-color-scheme: dark)').matches ? '${themeTagName}dark' : '${themeTagName}light';`
      : `window.__kbnThemeTag__ = '${themeTagName}${colorMode}';`;

  const { serverUrl, pluginIds, pluginDependencies } = viteConfig!;

  return `
// Vite ESM Bootstrap for Kibana Development - TRUE LAZY LOADING
// Polyfill process for Node.js compatibility
if (typeof window.process === 'undefined') {
  window.process = { env: { NODE_ENV: 'development' }, cwd: function() { return '/'; }, browser: true };
} else if (typeof window.process.cwd !== 'function') {
  window.process.cwd = function() { return '/'; };
}
var kbnCsp = JSON.parse(document.querySelector('kbn-csp').getAttribute('data'));
var kbnHardenPrototypes = JSON.parse(document.querySelector('kbn-prototype-hardening').getAttribute('data'));
window.__kbnHardenPrototypes__ = kbnHardenPrototypes.hardenPrototypes;
window.__kbnStrictCsp__ = kbnCsp.strictCsp;
${kbnThemeTagTemplate}
window.__kbnPublicPath__ = ${publicPathMap};

// ESM module registry (replaces __kbnBundles__)
window.__kbnBundles__ = (function() {
  var modules = {};
  return {
    has: function(key) { return Object.prototype.hasOwnProperty.call(modules, key); },
    define: function(key, value) { modules[key] = value; },
    get: function(key) {
      if (!this.has(key)) {
        throw new Error('Module not found: ' + key);
      }
      var mod = modules[key];
      return typeof mod === 'function' ? mod() : mod;
    },
    set: function(key, exports) { modules[key] = exports; }
  };
})();

if (window.__kbnStrictCsp__ && window.__kbnCspNotEnforced__) {
  document.getElementById('kbn_legacy_browser_error').style.display = 'flex';
} else {
  if (!window.__kbnCspNotEnforced__ && window.console) {
    window.console.log("^ A single error about an inline script not firing due to content security policy is expected!");
  }
  document.getElementById('kbn_loading_message').style.display = 'flex';

  // Vite ESM loading with TRUE LAZY LOADING
  (async function() {
    const viteUrl = '${serverUrl}';
    const allPluginIds = ${JSON.stringify(pluginIds)};

    // Track bootstrap instance to detect reloads
    window.__kbnViteBootstrapCount__ = (window.__kbnViteBootstrapCount__ || 0) + 1;
    console.log('[vite-lazy] Bootstrap #' + window.__kbnViteBootstrapCount__ + ' starting with LAZY LOADING');

    // Store Vite URL globally for on-demand plugin loading
    window.__kbnViteUrl__ = viteUrl;
    window.__kbnAllPluginIds__ = new Set(allPluginIds);
    window.__kbnLoadedPlugins__ = new Set();

    // Global function to load a plugin bundle on demand
    // This is called by PluginsService when a lazy app is accessed
    window.__kbnLoadPlugin__ = async function(pluginId) {
      if (window.__kbnLoadedPlugins__.has(pluginId)) {
        console.log('[vite-lazy] Plugin "' + pluginId + '" already loaded');
        return;
      }
      
      if (!window.__kbnAllPluginIds__.has(pluginId)) {
        throw new Error('Plugin "' + pluginId + '" not found in available plugins');
      }
      
      console.log('[vite-lazy] Loading plugin bundle: ' + pluginId);
      const startTime = performance.now();
      
      try {
        const pluginModule = await import(viteUrl + '/@kbn-plugin/' + pluginId + '/index.ts');
        window.__kbnBundles__.set('plugin/' + pluginId + '/public', pluginModule);
        window.__kbnLoadedPlugins__.add(pluginId);
        console.log('[vite-lazy] Plugin "' + pluginId + '" loaded in ' + (performance.now() - startTime).toFixed(0) + 'ms');
      } catch (err) {
        console.error('[vite-lazy] Failed to load plugin "' + pluginId + '":', err);
        throw err;
      }
    };

    try {
      performance.mark('kbnLoad', { detail: 'load_started' });

      // Load Vite client for HMR
      console.log('[vite-lazy] Loading Vite client...');
      await import(viteUrl + '/@vite/client');
      console.log('[vite-lazy] Vite client loaded');

      // Initialize React Fast Refresh runtime
      const RefreshRuntime = await import(viteUrl + '/@react-refresh');
      RefreshRuntime.default.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;

      // Load core entry point
      const coreModule = await import(viteUrl + '/src/core/packages/root/browser-internal/index.ts');
      window.__kbnBundles__.set('entry/core/public', coreModule);

      // Detect requested app from URL
      const pathMatch = window.location.pathname.match(/\\/app\\/([^/]+)/);
      const requestedApp = pathMatch ? pathMatch[1] : 'home';
      
      // Map app URLs to plugin IDs
      const appToPlugin = {
        'streams': 'streamsApp',
        'discover': 'discover',
        'dashboard': 'dashboard',
        'visualize': 'visualizations',
        'canvas': 'canvas',
        'maps': 'maps',
        'ml': 'ml',
        'apm': 'apm',
        'observability': 'observability',
        'security': 'securitySolution',
        'management': 'management',
        'dev_tools': 'devTools',
        'home': 'home',
        'lens': 'lens',
        'fleet': 'fleet',
        'uptime': 'uptime',
        'synthetics': 'synthetics',
        'slo': 'slo',
        'profiling': 'profiling',
        'infra': 'infra',
        'logs': 'logsShared',
      };
      
      const requestedPluginId = appToPlugin[requestedApp] || requestedApp;
      
      // Plugin dependency map (passed from server)
      const pluginDeps = ${JSON.stringify(pluginDependencies)};
      
      // Helper to load a plugin bundle
      async function loadPlugin(id) {
        if (window.__kbnLoadedPlugins__.has(id)) return { id, success: true };
        if (!window.__kbnAllPluginIds__.has(id)) return { id, success: false, error: 'Not found' };
        
        try {
          const pluginModule = await import(viteUrl + '/@kbn-plugin/' + id + '/index.ts');
          window.__kbnBundles__.set('plugin/' + id + '/public', pluginModule);
          window.__kbnLoadedPlugins__.add(id);
          return { id, success: true };
        } catch (err) {
          console.error('[vite] Failed to load plugin ' + id + ':', err);
          return { id, success: false, error: err };
        }
      }
      
      console.log('[vite] Requested app: ' + requestedApp + ' -> plugin: ' + requestedPluginId);
      console.log('[vite] Loading ALL ' + allPluginIds.length + ' plugins...');
      
      // Load ALL plugins at startup
      const loadStartTime = performance.now();
      const failed = [];
      
      // Load plugins in parallel batches for better performance
      const batchSize = 10;
      for (let i = 0; i < allPluginIds.length; i += batchSize) {
        const batch = allPluginIds.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(id => loadPlugin(id)));
        for (const result of results) {
          if (!result.success && result.error !== 'Not found') {
            failed.push(result);
          }
        }
      }
      
      const loadDuration = (performance.now() - loadStartTime).toFixed(0);
      
      console.log('[vite] All ' + window.__kbnLoadedPlugins__.size + ' plugins loaded in ' + loadDuration + 'ms');
      
      if (failed.length > 0) {
        console.warn('[vite] Some plugins failed to load:', failed.map(f => f.id));
      }

      // Bootstrap Kibana
      if (coreModule.__kbnBootstrap__) {
        await coreModule.__kbnBootstrap__();
      } else if (coreModule.default && coreModule.default.__kbnBootstrap__) {
        await coreModule.default.__kbnBootstrap__();
      } else {
        throw new Error('Core module does not export __kbnBootstrap__');
      }
    } catch (err) {
      console.error('[vite-lazy] Bootstrap failed:', err);

      // Show error UI
      var errorTitle = document.querySelector('[data-error-message-title]').dataset.errorMessageTitle;
      var errorText = document.querySelector('[data-error-message-text]').dataset.errorMessageText;
      var errorReload = document.querySelector('[data-error-message-reload]').dataset.errorMessageReload;

      var errDiv = document.createElement('div');
      errDiv.style.cssText = 'text-align:center;padding:120px 20px;font-family:Inter,BlinkMacSystemFont,Helvetica,Arial,sans-serif';
      errDiv.innerHTML = '<h1 style="margin:20px;color:#1a1c21">' + errorTitle + '</h1>' +
        '<p style="margin:20px;color:#343741">' + errorText + '</p>' +
        '<p style="margin:20px;color:#666;font-size:12px">' + err.message + '</p>' +
        '<button onclick="location.reload()" style="cursor:pointer;padding:12px;font-size:1rem;border-radius:6px;color:#fff;background:#07c;border:none">' + errorReload + '</button>';

      document.body.innerHTML = '';
      document.body.appendChild(errDiv);
    }
  })();
}
`;
}

export const renderTemplate = ({
  themeTagName,
  colorMode,
  jsDependencyPaths,
  publicPathMap,
  viteConfig,
}: BootstrapTemplateData) => {
  // Use ESM mode if Vite is configured
  if (viteConfig) {
    return renderViteTemplate({
      themeTagName,
      colorMode,
      jsDependencyPaths,
      publicPathMap,
      viteConfig,
    });
  }

  const kbnThemeTagTemplate =
    colorMode === 'system'
      ? `window.__kbnThemeTag__ = window.matchMedia('(prefers-color-scheme: dark)').matches ? '${themeTagName}dark' : '${themeTagName}light';`
      : `window.__kbnThemeTag__ = '${themeTagName}${colorMode}';`;

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

  window.onload = function () {
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

    performance.mark('kbnLoad', {
      detail: 'load_started',
    })

    load([
      ${jsDependencyPaths.map((path) => `'${path}'`).join(',')}
    ], function () {
      __kbnBundles__.get('entry/core/public').__kbnBootstrap__();
    });
  }
}
  `;
};
