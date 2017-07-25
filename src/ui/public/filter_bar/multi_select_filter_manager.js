import _ from 'lodash';

const MULTI_SELECT_KEY = 18; // alt

class MultiSelectFilterManager {
  constructor() {
    this.stagingFilters = false;
    this.stagedFilters = [];
    this.mapAndFlattenFilters = null;
    this.submitFilters = null;

    window.addEventListener('keydown', (event) => {
      if (event.keyCode === MULTI_SELECT_KEY) {
        this.stagingFilters = true;
        this.stagedFilters = [];
      }
    }, false);

    window.addEventListener('keyup', async (event) => {
      if (event.keyCode === MULTI_SELECT_KEY) {
        this.stagingFilters = false;

        if (!this.mapAndFlattenFilters || !this.submitFilters) {
          this.stagedFilters = [];
          return;
        }

        const filters = await this.mergeFilters();
        if (filters.length > 0) {
          this.submitFilters(filters);
        }
        this.stagedFilters = [];
      }
    }, false);
  }

  isStagingFilters() {
    return this.stagingFilters;
  }

  stage(filters) {
    this.stagedFilters = this.stagedFilters.concat(_.flatten(filters));
  }

  setMapAndFlattenFilters(func) {
    this.mapAndFlattenFilters = func;
  }

  setSubmitFilters(func) {
    this.submitFilters = func;
  }

  async mergeFilters() {

    const filtersWithMeta = await this.mapAndFlattenFilters(this.stagedFilters);

    // Group filters by key
    const filterGroups = new Map();
    const filtersWithNoKey = [];
    filtersWithMeta.forEach((filter) => {
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

        // Key with multiple filters - combine into OR query
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
}

const multiSelectFilterManager = new MultiSelectFilterManager();

export { multiSelectFilterManager };

function cleanFilter(filter) {
  if (_.has(filter, 'query')) {
    return filter.query;
  }

  delete filter.meta;
  return filter;
}
