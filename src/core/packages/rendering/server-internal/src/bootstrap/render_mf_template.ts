/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bootstrap template for Module Federation mode
 * 
 * This template replaces the __kbnBundles__ system with the MF runtime.
 * Plugins are loaded as MF remotes and share dependencies via MF shared scope.
 */

export interface MFBootstrapTemplateData {
  colorMode: string;
  themeTagName: string;
  /** URL to the core remote entry */
  coreRemoteEntry: string;
  /** Plugin remote entries */
  plugins: Array<{
    id: string;
    remoteEntry: string;
  }>;
  publicPathMap: string;
}

export const renderMFTemplate = ({
  themeTagName,
  colorMode,
  coreRemoteEntry,
  plugins,
  publicPathMap,
}: MFBootstrapTemplateData) => {
  const kbnThemeTagTemplate =
    colorMode === 'system'
      ? `window.__kbnThemeTag__ = window.matchMedia('(prefers-color-scheme: dark)').matches ? '${themeTagName}dark' : '${themeTagName}light';`
      : `window.__kbnThemeTag__ = '${themeTagName}${colorMode}';`;

  // Generate plugin registrations
  const pluginRegistrations = plugins
    .map((p) => `    __kbnMF__.registerPlugin('${p.id}', '${p.remoteEntry}');`)
    .join('\n');

  return `
// Kibana Module Federation Bootstrap
// Dependencies are shared via MF, not pre-bundled

var kbnCsp = JSON.parse(document.querySelector('kbn-csp').getAttribute('data'));
var kbnHardenPrototypes = JSON.parse(document.querySelector('kbn-prototype-hardening').getAttribute('data'));
window.__kbnHardenPrototypes__ = kbnHardenPrototypes.hardenPrototypes;
window.__kbnStrictCsp__ = kbnCsp.strictCsp;
${kbnThemeTagTemplate}
window.__kbnPublicPath__ = ${publicPathMap};

// Module Federation Runtime
(function() {
  'use strict';

  var loadedContainers = new Map();
  var loadingPromises = new Map();
  var pluginRegistry = new Map();
  // Shared scope is populated by MF at runtime
  var shareScope = {};

  window.__kbnMF__ = {
    registerPlugin: function(id, remoteEntry) {
      pluginRegistry.set(id, remoteEntry);
    },

    loadPlugin: function(id) {
      return this._loadContainer(id).then(function(container) {
        return container.get('./public').then(function(factory) {
          var module = factory();
          return module.default || module.plugin || module;
        });
      });
    },

    loadPluginExport: function(id, exportName) {
      return this._loadContainer(id).then(function(container) {
        var modulePath = exportName === 'public' ? './public' : './' + exportName;
        return container.get(modulePath).then(function(factory) {
          var module = factory();
          return module.default || module[exportName] || module;
        });
      });
    },

    isPluginLoaded: function(id) {
      return loadedContainers.has(id);
    },

    getLoadedPlugins: function() {
      return Array.from(loadedContainers.keys());
    },

    _loadContainer: function(id) {
      var self = this;

      if (loadedContainers.has(id)) {
        return Promise.resolve(loadedContainers.get(id));
      }

      if (loadingPromises.has(id)) {
        return loadingPromises.get(id);
      }

      var remoteEntry = pluginRegistry.get(id);
      if (!remoteEntry) {
        return Promise.reject(new Error('Plugin "' + id + '" is not registered'));
      }

      var loadPromise = self._loadScript(remoteEntry).then(function() {
        var containerName = 'plugin_' + id.replace(/-/g, '_');
        var container = window[containerName];

        if (!container) {
          // Try alternative naming
          containerName = id.replace(/-/g, '_');
          container = window[containerName];
        }

        if (!container) {
          throw new Error('Failed to load container for plugin "' + id + '". Container "' + containerName + '" not found.');
        }

        return container.init(shareScope).then(function() {
          loadedContainers.set(id, container);
          return container;
        });
      });

      loadingPromises.set(id, loadPromise);

      return loadPromise.finally(function() {
        loadingPromises.delete(id);
      });
    },

    _loadScript: function(url) {
      return new Promise(function(resolve, reject) {
        var existing = document.querySelector('script[src="' + url + '"]');
        if (existing) {
          if (existing.dataset.loaded === 'true') {
            resolve();
            return;
          }
          // Wait for existing script to load
          existing.addEventListener('load', resolve);
          existing.addEventListener('error', function() {
            reject(new Error('Failed to load script: ' + url));
          });
          return;
        }

        var script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.loaded = 'false';
        script.onload = function() {
          script.dataset.loaded = 'true';
          resolve();
        };
        script.onerror = function() {
          reject(new Error('Failed to load script: ' + url));
        };
        document.head.appendChild(script);
      });
    },

    // Initialize the share scope with eager modules
    _initShareScope: function(scope) {
      shareScope = scope || {};
    }
  };

  // Register all plugins
${pluginRegistrations}

})();

// Legacy compatibility: provide __kbnBundles__ that delegates to __kbnMF__
window.__kbnBundles__ = {
  has: function(key) {
    // Parse key format: 'plugin/{id}/public' or 'entry/{id}/public'
    var match = key.match(/^(plugin|entry)\\/([^\\/]+)\\/public$/);
    if (!match) return false;
    var id = match[2];
    return window.__kbnMF__.isPluginLoaded(id) || 
           window.__kbnMF__._pluginRegistry?.has(id) ||
           true; // Assume registered plugins exist
  },
  get: function(key) {
    var match = key.match(/^(plugin|entry)\\/([^\\/]+)\\/public$/);
    if (!match) {
      throw new Error('__kbnBundles__ (MF compat): invalid key format "' + key + '"');
    }
    var id = match[2];
    // Return a promise-like object for async loading
    // This may break some synchronous code but is necessary for MF
    return {
      then: function(cb) {
        return window.__kbnMF__.loadPlugin(id).then(cb);
      }
    };
  }
};

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
    function failure(error) {
      // make subsequent calls to failure() noop
      failure = function () {};

      console.error('Kibana bootstrap failed:', error);

      var errorTitle = document.querySelector('[data-error-message-title]').dataset.errorMessageTitle;
      var errorText = document.querySelector('[data-error-message-text]').dataset.errorMessageText;
      var errorReload = document.querySelector('[data-error-message-reload]').dataset.errorMessageReload;

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

    performance.mark('kbnLoad', {
      detail: 'load_started',
    });

    // Load core remote entry first, then bootstrap
    window.__kbnMF__._loadScript('${coreRemoteEntry}')
      .then(function() {
        // Initialize core container
        var coreContainer = window.kibana_core || window.kibana_host;
        if (!coreContainer) {
          throw new Error('Core container not found after loading remote entry');
        }
        
        // Init core with share scope
        return coreContainer.init(window.__kbnMF__._shareScope || {});
      })
      .then(function() {
        // Get core module
        var coreContainer = window.kibana_core || window.kibana_host;
        return coreContainer.get('./public');
      })
      .then(function(factory) {
        var coreModule = factory();
        // Bootstrap Kibana
        if (coreModule.__kbnBootstrap__) {
          return coreModule.__kbnBootstrap__();
        } else if (coreModule.default && coreModule.default.__kbnBootstrap__) {
          return coreModule.default.__kbnBootstrap__();
        } else {
          throw new Error('Core module does not export __kbnBootstrap__');
        }
      })
      .catch(failure);
  };
}
  `;
};
