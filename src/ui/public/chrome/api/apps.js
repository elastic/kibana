var _ = require('lodash');

module.exports = function (chrome, internals) {

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
    return internals.showAppsLink == null ? internals.appCount > 1 : internals.showAppsLink;
  };

  chrome.getApp = function () {
    return _.clone(internals.app);
  };

  chrome.getAppTitle = function () {
    return internals.app.title;
  };

  chrome.getAppId = function () {
    return internals.app.id;
  };

};
