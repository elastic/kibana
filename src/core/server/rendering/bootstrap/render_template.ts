/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface BootstrapTemplateData {
  themeTag: string;
  jsDependencyPaths: string[];
  publicPathMap: string;
}

export const renderTemplate = ({
  themeTag,
  jsDependencyPaths,
  publicPathMap,
}: BootstrapTemplateData) => {
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
window.__kbnStrictCsp__ = kbnCsp.strictCsp;
window.__kbnThemeTag__ = "${themeTag}";
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

      var err = document.createElement('h1');
      err.style['color'] = 'white';
      err.style['font-family'] = 'monospace';
      err.style['text-align'] = 'center';
      err.style['background'] = '#F44336';
      err.style['padding'] = '25px';
      err.innerText = document.querySelector('[data-error-message]').dataset.errorMessage;

      document.body.innerHTML = err.outerHTML;
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

    load([
      ${jsDependencyPaths.map((path) => `'${path}'`).join(',')}
    ], function () {
      __kbnBundles__.get('entry/core/public').__kbnBootstrap__();
    });
  }
}
  `;
};
