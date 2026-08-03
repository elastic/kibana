/**
 * As Code Filter Transform Utilities
 *
 * This module provides conversion utilities between AsCodeFilter format
 * (used in Kibana's As Code APIs) and StoredFilter format (used in saved objects/URL state).
 */
export { fromStoredFilter, fromStoredFilters } from './src/from_stored_filter';
export { toStoredFilter, toStoredFilters } from './src/to_stored_filter';
export { isConditionFilter, isGroupFilter, isDSLFilter, isRangeConditionFilter, isAsCodeFilter, } from './src/type_guards';
export { FilterConversionError } from './src/errors';
export type { StoredFilter } from './src/types';
