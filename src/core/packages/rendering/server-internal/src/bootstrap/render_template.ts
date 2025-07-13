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
  cssTemplates: string[];
}

export const renderTemplate = ({
  themeTagName,
  colorMode,
  jsDependencyPaths,
  publicPathMap,
  cssTemplates
}: BootstrapTemplateData) => {
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
      var preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'style';
      preloadLink.href = url;

      preloadLink.onload = function() {
        this.onload = null;
        this.rel = 'stylesheet';
      };

      if (typeof failure === 'function') {
        preloadLink.addEventListener('error', failure);
      }
      if (typeof cb === 'function') {
        preloadLink.addEventListener('load', cb);
      }

      document.head.insertBefore(preloadLink, stylesheetTarget);
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
 load([
      ${cssTemplates.map((path) => `'${path}'`).join(',')}
    ], function () {
      __kbnBundles__.get('entry/core/public').__kbnBootstrap__();
    });
  }
}
  `;
};
