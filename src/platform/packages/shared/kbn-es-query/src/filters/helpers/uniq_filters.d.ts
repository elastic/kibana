import type { Filter, FilterCompareOptions } from '..';
/**
 * Remove duplicate filters from an array of filters
 *
 * @param {array} filters The filters to remove duplicates from
 * @param {object} comparatorOptions - Parameters to use for comparison
 * @returns {object} The original filters array with duplicates removed
 * @public
 */
export declare const uniqFilters: (filters: Filter[], comparatorOptions?: FilterCompareOptions) => Filter[];
