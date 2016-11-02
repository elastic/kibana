import _ from 'lodash';

module.exports = function (chrome, internals) {
  /**
   * ui/chrome Controls API
   *
   *   Exposes controls for the Kibana chrome
   *
   *   Visible
   *     determines if the Kibana chrome should be displayed
   */

  let def = true;
  internals.setVisibleDefault = (_def) => def = Boolean(_def);

  /**
   * @param {boolean} display - should the chrome be displayed
   * @return {chrome}
   */
  chrome.setVisible = function (display) {
    internals.visible = Boolean(display);
    return chrome;
  };

  /**
   * @return {boolean} - display state of the chrome
   */
  chrome.getVisible = function () {
    if (_.isUndefined(internals.visible)) return def;
    return internals.visible;
  };

  /**
   * @param {boolean} showSearch - should the chrome Search Bar be displayed
   * @return {chrome}
   */
  chrome.setShowSearch = function (showSearch) {
    internals.showSearch = Boolean(showSearch);
    return chrome;
  };

  /**
   * @return {boolean} - Show Search Bar state of the chrome
   */
  chrome.getShowSearch = function () {
    if (_.isUndefined(internals.showSearch)) return true;
    return internals.showSearch;
  };
};
