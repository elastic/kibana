import _ from 'lodash';

/**
 * Create single filter per data field. Fields with multiple filters are merged into a bool query.
 * Filters without meta.key can not be merged because field is unknown.
 *
 * @param {array} filters to merge.
 * @returns {array} merged filters
 */
export function mergeFilters(filters) {
  // Group filters by key
  const filterGroups = new Map();
  const filtersWithNoKey = [];
  filters.forEach((filter) => {
    const key = _.get(filter, 'meta.key');
    if (!key) {
      filtersWithNoKey.push(filter);
      return;
    }

    if (!filterGroups.has(key)) {
      filterGroups.set(key, [filter]);
    } else {
      filterGroups.set(key, filterGroups.get(key).concat(filter));
    }
  });

  const filtersWithKey = [];
  filterGroups.forEach((filterGroup, key) => {
    if (filterGroup.length === 1) {
      // Key with only one filter
      filtersWithKey.push(filterGroup[0]);
    } else {
      // Key with multiple filters - combine into OR query
      const values = [];
      const shouldFilters = [];
      const mustNotFilters = [];
      filterGroup.forEach((filter) => {
        const value = _.get(filter, 'meta.value', '');
        if (_.get(filter, 'meta.negate', false)) {
          values.push('!' + value);
          mustNotFilters.push(cleanFilter(filter));
        } else {
          values.push(value);
          shouldFilters.push(cleanFilter(filter));
        }
      });
      filtersWithKey.push({
        bool: {
          should: shouldFilters,
          must_not: mustNotFilters
        },
        meta: {
          alias: `${key}: ${values.join()}`
        }
      });
    }
  });

  return filtersWithKey.concat(filtersWithNoKey);
}

function cleanFilter(filter) {
  if (_.has(filter, 'query')) {
    return filter.query;
  }

  delete filter.meta;
  return filter;
}

const CTRL_KEY = 17;
const MACOS_COMMAND_KEY = 93;
let isMultiSelect = false;
window.addEventListener('keydown', (event) => {
  if (event.keyCode === CTRL_KEY || event.keyCode === MACOS_COMMAND_KEY) {
    isMultiSelect = true;
  }
}, false);
window.addEventListener('keyup', (event) => {
  if (event.keyCode === CTRL_KEY || event.keyCode === MACOS_COMMAND_KEY) {
    isMultiSelect = false;
  }
}, false);

/**
 * Use this function to know when multi-select functionallity is enabled.
 *
 * @returns {boolean} Is multi-select functionallity enabled?
 */
export function isMultiSelectEnabled() {
  return isMultiSelect;
}
