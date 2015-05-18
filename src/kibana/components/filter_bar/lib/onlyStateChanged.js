define(function (require) {
  var _ = require('lodash');

  var makeComparable = function (filter) {
    return _.omit(filter, ['$state', '$$hashKey']);
  };

  /**
   * Checks to see if only disabled filters have been changed
   * @returns {bool} Only disabled filters
   */
  return function (newFilters, oldFilters) {
    var comparableOldFilters = _.map(oldFilters, makeComparable);
    return _.every(newFilters, function (newFilter, i) {
      var match = _.find(comparableOldFilters, makeComparable(newFilter));
      return !!match;
    });
  };
});
