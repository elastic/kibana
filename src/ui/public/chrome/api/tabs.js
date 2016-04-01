let _ = require('lodash');
let TabCollection = require('../TabCollection');

module.exports = function (chrome, internals) {

  internals.tabs = new TabCollection({
    defaults: {
      baseUrl: `${chrome.getAppUrl()}#/`
    }
  });

  /**
   * ui/chrome tabs API
   *
   *   The navbar at the top of the page can be assigned links which will
   *   pile up on the left. Each of these links has several properties that define
   *   how it is rendered, how it looks when it's "active" and what happens when
   *   it's clicked.
   *
   *   To define a set of tabs, pass setTabs an array of TabSpec objects,
   *   which are just plain objects with the following properties:
   *
   *   id {string}
   *     a unique value for this tab, should match the first path segment of
   *     routes that are supposed to belong to this tab and is matched against the route
   *     everytime it changes. When clicking the tab for the first time the user will be
   *     sent to the '/${tab.id}' url which you can use to redirect to another url if needed
   *
   *   title {string}
   *     the text the tab should show
   *
   *   resetWhenActive {boolean}
   *     when the the tab is considered active, should clicking it
   *     cause a redirect to just the id?
   *
   *   trackLastUrl {boolean}
   *     When this tab is active, should the current path be tracked
   *     and persisted to session storage, then used as the tabs href attribute when the user navigates
   *     away from the tab?
   *
   *   activeIndicatorColor {string}
   *     css color string that will be used to style the active
   *     indicator applied to tabs which are currently active.
   */

  /**
   * @param {TabSpec[]} tabSpecs
   * @return {chrome}
   */
  chrome.setTabs = function (tabSpecs) {
    internals.tabs.set(tabSpecs);
    return chrome;
  };

  /**
   * @param {Object} defaults - defaults used for each tab
   * @return {chrome}
   */
  chrome.setTabDefaults = function (defaults) {
    internals.tabs.setDefaults(defaults);
    return chrome;
  };

  /**
   * @return {Tab[]}
   */
  chrome.getTabs = function () {
    return internals.tabs.get();
  };


  /**
   * @return {Tab}
   */
  chrome.getActiveTab = function () {
    return internals.tabs.getActive();
  };

  /**
   * @param {any} def - the default value if there isn't any active tab
   * @return {any}
   */
  chrome.getActiveTabId = activeGetter('id');

  /**
   * @param {any} def - the default value if there isn't any active tab
   * @return {any}
   */
  chrome.getActiveTabTitle = activeGetter('title');

  // create a getter for properties of the active tab
  function activeGetter(prop) {
    return function (def) {
      let active = chrome.getActiveTab();
      return !active ? def : active[prop];
    };
  }

};
