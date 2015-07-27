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
   * @param {string} logo - css background value
   * @param {string|bool} [smallLogo] - css background value, true to reuse the regular logo
   * @return {chrome}
   */
  chrome.setLogo = function (logo, smallLogo) {
    if (smallLogo === true) {
      smallLogo = logo;
    }

    chrome.logo = logo;
    chrome.smallLogo = smallLogo;

    return chrome;
  };

  /**
   * @param {string} val - the text to display
   * @return {chrome}
   */
  chrome.setBrand = function (val) {
    internals.brand = val;
    return chrome;
  };

  /**
   * @return {string} - the brand text
   */
  chrome.getBrand = function () {
    return internals.brand;
  };

};
