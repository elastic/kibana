import _ from 'lodash';
import { dedupFilters } from './dedup_filters';

/**
 * Remove duplicate filters from an array of filters
 * @param {array} filters The filters to remove duplicates from
 * @returns {object} The original filters array with duplicates removed
 */
export function uniqFilters(filters, comparatorOptions) {
  let results = [];
  _.each(filters, function (filter) {
    results = _.union(results, dedupFilters(results, [filter], comparatorOptions));
  });
  return results;
}
