import type { Filter } from '../build_filters';
/** @public */
export interface FilterCompareOptions {
    index?: boolean;
    disabled?: boolean;
    negate?: boolean;
    group?: boolean;
    state?: boolean;
    alias?: boolean;
}
/**
 * Include disabled, negate and store when comparing filters
 * @public
 */
export declare const COMPARE_ALL_OPTIONS: FilterCompareOptions;
/**
 * Compare two filters or filter arrays to see if they match.
 * For filter arrays, the assumption is they are sorted.
 *
 * @param {Filter | Filter[]} first The first filter or filter array to compare
 * @param {Filter | Filter[]} second The second filter or filter array to compare
 * @param {FilterCompareOptions} comparatorOptions Parameters to use for comparison
 *
 * @returns {bool} Filters are the same
 *
 * @public
 */
export declare const compareFilters: (first: Filter | Filter[], second: Filter | Filter[], comparatorOptions?: FilterCompareOptions) => boolean;
