var _ = require('lodash');

module.exports = function (chrome, internals) {
  /**
   * ui/chrome Theme API
   *
   *   Nav Background
   *     applies to the entire nav bar and is specified as a css string.
   *     eg. 'red' or 'url(..) no-repeat left center'
   *
   *   Logo
   *     Set the background for the logo and small logo in the navbar.
   *     When the app is in the "small" category, a modified version of the
   *     logo is displayed that is 45px wide.
   *     eg. 'url(/plugins/app/logo.png) center no-repeat'
   *
   *   Brand
   *     Similar to a logo, but is just text with styles to make it stick out.
   */

  /**
   * @param {string} background - css background definition
   * @return {chrome}
   */
  chrome.setNavBackground = function (cssBackground) {
    internals.navBackground = cssBackground;
    return chrome;
  };

  /**
   * @return {string} - css background
   */
  chrome.getNavBackground = function () {
    return internals.navBackground;
  };

  /**
   * @param {string|object} item - brand key to set, or object to apply
   * @param {mixed} val - value to put on the brand item
   * @return {chrome}
   */
  chrome.setBrand = function (item, val) {
    internals.brand = internals.brand || {};

    // allow objects to be passed in
    if (_.isPlainObject(item)) {
      internals.brand = _.clone(item);
    } else {
      internals.brand[item] = val;
    }

    return chrome;
  };

  /**
   * @return {string} - the brand text
   */
  chrome.getBrand = function (item) {
    if (!internals.brand) return;
    return internals.brand[item];
  };

};
