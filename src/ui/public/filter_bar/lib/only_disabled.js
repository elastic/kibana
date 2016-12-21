import _ from 'lodash';

const pluckDisabled = function (filter) {
  return _.get(filter, 'meta.disabled');
};

/**
 * Checks to see if only disabled filters have been changed
 * @returns {bool} Only disabled filters
 */
export default function (newFilters, oldFilters) {
  return _.every(newFilters.concat(oldFilters), function (newFilter) {
    return pluckDisabled(newFilter);
  });
}
