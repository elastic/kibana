define(function (require) {
  var _ = require('lodash');

  /**
   * Take text from the user and make it into a query object
   * @param {text} user's query input
   * @returns {object}
   */
  return function (text) {
    // If we get an empty object, treat it as a *
    if (_.isObject(text)) {
      if (Object.keys(text).length) {
        return text;
      } else {
        return {query_string: {query: '*'}};
      }
    }

    // Nope, not an object.
    text = (text || '').trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      return {query_string: {query: text || '*'}};
    }
  };
});
