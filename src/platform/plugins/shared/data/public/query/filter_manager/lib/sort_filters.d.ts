import type { Filter } from '@kbn/es-query';
/**
 * Sort filters according to their store - global filters go first
 *
 * @param {object} first The first filter to compare
 * @param {object} second The second filter to compare
 *
 * @returns {number} Sorting order of filters
 */
export declare const sortFilters: ({ $state: a }: Filter, { $state: b }: Filter) => number;
