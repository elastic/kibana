import type { Filter } from '..';
import type { FilterCompareOptions } from './compare_filters';
/**
 * Checks to see if only disabled filters have been changed
 * @returns {bool} Only disabled filters
 *
 * @public
 */
export declare const onlyDisabledFiltersChanged: (newFilters?: Filter[], oldFilters?: Filter[], comparatorOptions?: FilterCompareOptions) => boolean;
