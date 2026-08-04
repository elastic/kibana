/**
 * Functions for converting AsCodeFilter to stored filter format
 */
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { Logger } from '@kbn/logging';
import type { StoredFilter } from './types';
/**
 * Convert AsCodeFilter to stored Filter
 *
 * @param filter The AsCodeFilter to convert
 * @param logger Optional logger for warnings
 * @returns StoredFilter or undefined if conversion fails
 */
export declare function toStoredFilter(filter: AsCodeFilter, logger?: Logger): StoredFilter | undefined;
/**
 * Convert array of AsCode filters to stored filters, filtering out conversion failures
 *
 * This helper encapsulates the common pattern of converting an array of AsCode filters
 * and filtering out any that fail to convert (return undefined).
 *
 * @param filters Array of AsCode filters to convert
 * @param logger Optional logger for conversion warnings
 * @returns Array of successfully converted stored filters (undefined values filtered out), or undefined if input is undefined
 *
 * @public
 */
export declare function toStoredFilters(filters: AsCodeFilter[] | undefined, logger?: Logger): StoredFilter[] | undefined;
