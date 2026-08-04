/**
 * Functions for converting stored filters to AsCodeFilter format
 *
 * CONVERSION APPROACH:
 * - Type-first: Uses meta.type from FILTERS enum for explicit, deterministic routing
 * - Fallback: Filters without meta.type are preserved as DSL to prevent data loss
 * - DSL Preservation: Complex filters that can't be simplified are preserved as DSL
 *
 * This approach eliminates ambiguity, prevents data loss, and maintains backward compatibility.
 */
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { Logger } from '@kbn/logging';
/**
 * Convert stored Filter (from saved objects/URL state) to AsCodeFilter
 *
 * Uses type-first routing based on meta.type. Filters without meta.type are preserved
 * as DSL to prevent data loss from incorrect parsing of complex queries.
 *
 * @param storedFilter The filter to convert (typically from saved object or URL state)
 * @returns AsCodeFilter with condition, group, or dsl format or undefined if conversion fails
 */
export declare function fromStoredFilter(storedFilter: unknown, logger?: Logger): AsCodeFilter | undefined;
/**
 * Convert array of stored filters to AsCode filters, filtering out conversion failures
 *
 * This helper encapsulates the common pattern of converting an array of stored filters
 * and filtering out any that fail to convert (return undefined).
 *
 * @param filters Array of stored filters to convert
 * @param logger Optional logger for conversion warnings
 * @returns Array of successfully converted AsCode filters (undefined values filtered out), or undefined if input is undefined
 *
 * @public
 */
export declare function fromStoredFilters(filters: unknown[] | undefined, logger?: Logger): AsCodeFilter[] | undefined;
