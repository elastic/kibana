module.exports = function (chrome, internals) {
  /**
   * ui/chrome Translations API
   *
   *   Translations
   *     Returns the translations which have been loaded by the Kibana server instance
   */

  /**
   * @return {Object} - Translations
   */
  chrome.getTranslations = function () {
    return internals.translations || [];
  };
};
