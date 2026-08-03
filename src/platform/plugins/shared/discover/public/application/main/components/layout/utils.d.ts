import type { Filter } from '@kbn/es-query';
/**
 * Returns if true there's at least 1 active filter
 */
export declare function hasActiveFilter(filters: Filter[] | undefined): boolean | undefined;
