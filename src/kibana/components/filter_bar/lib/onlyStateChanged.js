define(function (require) {
  var _ = require('lodash');
  var compareFilters = require('components/filter_bar/lib/compareFilters');
  var compareOptions = { disabled: true, negate: true };

  /**
   * Checks to see if only disabled filters have been changed
   * @returns {bool} Only disabled filters
   */
  return function (newFilters, oldFilters) {
    return _.every(newFilters, function (newFilter, i) {
      var match = _.find(oldFilters, function (oldFilter) {
        return compareFilters(newFilter, oldFilter, compareOptions);
      });
      return !!match;
    });
  };
});
