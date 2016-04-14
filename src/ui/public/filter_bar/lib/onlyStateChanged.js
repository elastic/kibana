define(function (require) {
  let _ = require('lodash');
  let compareFilters = require('ui/filter_bar/lib/compareFilters');
  let compareOptions = { disabled: true, negate: true };

  /**
   * Checks to see if only disabled filters have been changed
   * @returns {bool} Only disabled filters
   */
  return function (newFilters, oldFilters) {
    return _.every(newFilters, function (newFilter, i) {
      let match = _.find(oldFilters, function (oldFilter) {
        return compareFilters(newFilter, oldFilter, compareOptions);
      });
      return !!match;
    });
  };
});
