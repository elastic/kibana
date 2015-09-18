const { clone, get } = require('lodash');
const { resolve } = require('url');

module.exports = function (chrome, internals) {

  if (internals.app) {
    internals.app.url = resolve(window.location.href, internals.app.url);
  }

  internals.appUrlStore = internals.appUrlStore || window.sessionStorage;

  /**
   * ui/chrome apps API
   *
   *   ui/chrome has some metadata about the current app, and enables the
   *   navbar link, a small grid to the left of the tabs, when there is more
   *   than one app installed.
   */

  chrome.setShowAppsLink = function (val) {
    internals.showAppsLink = !!val;
    return chrome;
  };

  chrome.getShowAppsLink = function () {
    return internals.showAppsLink == null ? internals.nav.length > 1 : internals.showAppsLink;
  };

  chrome.getApp = function () {
    return clone(internals.app);
  };

  chrome.getAppTitle = function () {
    return get(internals, ['app', 'title']);
  };

  chrome.getAppUrl = function () {
    return get(internals, ['app', 'url']);
  };

  chrome.getInjected = function (name, def) {
    if (name == null) return clone(internals.vars) || {};
    return get(internals.vars, name, def);
  };

  chrome.getLastUrlFor = function (appId) {
    return internals.appUrlStore.getItem(`appLastUrl:${appId}`);
  };

  chrome.setLastUrlFor = function (appId, url) {
    internals.appUrlStore.setItem(`appLastUrl:${appId}`, url);
  };


};
