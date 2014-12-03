define(function (require) {
  var _ = require('lodash');

  /**
   * Take text from the model and present it to the user as a string
   * @param {text} model value
   * @returns {string}
   */
  return function (text) {
    if (_.isUndefined(text)) return '';
    if (_.isString(text)) return text;
    if (_.isObject(text)) {
      if (text.query_string) return text.query_string.query;
      return JSON.stringify(text);
    }
    return text.toString();
  };
});
