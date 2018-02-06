import _ from 'lodash';
import { migrateFilter } from '../_migrate_filter';

/**
 * Create a filter that can be reversed for filters with negate set
 * @param {boolean} reverse This will reverse the filter. If true then
 *                          anything where negate is set will come
 *                          through otherwise it will filter out
 * @returns {function}
 */
const filterNegate = function (reverse) {
  return function (filter) {
    if (_.isUndefined(filter.meta) || _.isUndefined(filter.meta.negate)) return !reverse;
    return filter.meta && filter.meta.negate === reverse;
  };
};

/**
 * Translate a filter into a query to support es 5+
 * @param  {Object} filter - The filter to translate
 * @return {Object} the query version of that filter
 */
const translateToQuery = function (filter) {
  if (!filter) return;

  if (filter.query) {
    return filter.query;
  }

  return filter;
};

/**
 * Clean out any invalid attributes from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 */
const cleanFilter = function (filter) {
  return _.omit(filter, ['meta', '$state']);
};

export function buildQueryFromFilters(filters, decorateQuery, indexPattern) {
  _.each(filters, function (filter) {
    if (filter.query) {
      decorateQuery(filter.query);
    }
  });

  return {
    must: (filters || [])
      .filter(filterNegate(false))
      .map(translateToQuery)
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
    filter: [],
    should: [],
    must_not: (filters || [])
      .filter(filterNegate(true))
      .map(translateToQuery)
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
  };
}
