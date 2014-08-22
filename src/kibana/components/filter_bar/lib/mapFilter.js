define(function (require) {
  var _ = require('lodash');

  /**
   * Map the filter into an object with the key and value exposed so it's
   * easier to work with in the template
   * @param {object} fitler The filter the map
   * @returns {object}
   */
  return function (filter) {
    var key, value;
    if (filter.query) {
      key = _.keys(filter.query.match)[0];
      value = filter.query.match[key].query;
    } else if (filter.exists) {
      key = 'exists';
      value = filter.exists.field;
    } else if (filter.missing) {
      key = 'missing';
      value = filter.missing.field;
    }
    return {
      key: key,
      value: value,
      disabled: !!(filter.disabled),
      negate: !!(filter.negate),
      filter: filter
    };
  };
});
