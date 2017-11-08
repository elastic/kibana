import _ from 'lodash';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function (chrome, internals) {
  /**
   * ui/chrome Controls API
   *
   *   Exposes controls for the Kibana chrome
   *
   *   Visible
   *     determines if the Kibana chrome should be displayed
   */

  let permanentlyHideChrome = false;
  internals.permanentlyHideChrome = () => {
    permanentlyHideChrome = true;
    internals.visible = false;
  };

  chrome.getIsChromePermanentlyHidden = () => {
    return permanentlyHideChrome;
  };

  /**
   * @param {boolean} display - should the chrome be displayed
   * @return {chrome}
   */
  chrome.setVisible = function (display) {
    if (permanentlyHideChrome) {
      return chrome;
    }
    internals.visible = Boolean(display);
    return chrome;
  };

  /**
   * @return {boolean} - display state of the chrome
   */
  chrome.getVisible = function () {
    if (_.isUndefined(internals.visible)) return !permanentlyHideChrome;
    return internals.visible;
  };
}
