import _ from 'lodash';
import compareFilters from 'ui/filter_bar/lib/compare_filters';
const compareOptions = { disabled: true, negate: true };

/**
 * Checks to see if only disabled filters have been changed
 * @returns {bool} Only disabled filters
 */
export default function (newFilters, oldFilters) {
  return _.every(newFilters, function (newFilter) {
    const match = _.find(oldFilters, function (oldFilter) {
      return compareFilters(newFilter, oldFilter, compareOptions);
    });
    return !!match;
  });
}
