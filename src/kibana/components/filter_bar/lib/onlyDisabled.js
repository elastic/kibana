define(function (require) {
  var _ = require('lodash');

  var pluckDisabled = function (filter) {
    return _.deepGet(filter, 'meta.disabled');
  };

  /**
   * Checks to see if only disabled filters have been changed
   * @returns {bool} Only disabled filters
   */
  return function (newFilters, oldFilters) {
    return _.every(newFilters.concat(oldFilters), function (newFilter) {
      return pluckDisabled(newFilter);
    });
  };
});
