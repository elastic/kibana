/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

import type {
  AsCodeFilter,
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
  AsCodeSpatialFilter,
} from '@kbn/as-code-filters-schema';
import type { Logger } from '@kbn/logging';
import { FilterStateStore } from '@kbn/es-query-constants';
import { ASCODE_FILTER_OPERATOR, ASCODE_FILTER_TYPE } from '@kbn/as-code-filters-constants';
import { migrateFilter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import type { StoredFilter } from './types';
import { FilterConversionError } from './errors';
import {
  hasTermQuery,
  hasTermsQuery,
  hasRangeQuery,
  hasExistsQuery,
  hasMatchQuery,
  hasMatchPhraseQuery,
  isPhrasesFilter,
  isCombinedFilter,
} from './type_guards';

/**
 * Convert stored Filter (from saved objects/URL state) to AsCodeFilter
 *
 * Uses type-first routing based on meta.type. Filters without meta.type are preserved
 * as DSL to prevent data loss from incorrect parsing of complex queries.
 *
 * @param storedFilter The filter to convert (typically from saved object or URL state)
 * @returns AsCodeFilter with condition, group, or dsl format or undefined if conversion fails
 */
export function fromStoredFilter(storedFilter: unknown, logger?: Logger): AsCodeFilter | undefined {
  try {
    // Validate input is a non-null object
    if (!storedFilter || typeof storedFilter !== 'object') {
      throw new FilterConversionError(
        'Failed to convert stored filter: filter is null, undefined, or not an object',
        storedFilter
      );
    }

    // Cast to StoredFilter for type-safe access
    const filter = storedFilter as StoredFilter;

    // Skip pinned filters (globalState) - these are UI-level state and should not be persisted in AsCodeFilter format
    if (filter.$state?.store === FilterStateStore.GLOBAL_STATE) {
      return undefined;
    }

    const normalizedFilter = migrateFilter(filter);

    const baseProperties = extractBaseProperties(normalizedFilter);

    // TYPE-FIRST ROUTING: Use meta.type when available
    const filterType = normalizedFilter.meta?.type;

    if (filterType) {
      switch (filterType) {
        case FILTERS.CUSTOM:
          return convertCustomFilter(normalizedFilter, baseProperties);

        case FILTERS.PHRASE:
          return convertPhraseFilter(normalizedFilter, baseProperties);

        case FILTERS.PHRASES:
          return convertPhrasesFilter(normalizedFilter, baseProperties);

        case FILTERS.RANGE:
        case FILTERS.RANGE_FROM_VALUE:
          return convertRangeFilter(normalizedFilter, baseProperties);

        case FILTERS.EXISTS:
          return convertExistsFilter(normalizedFilter, baseProperties);

        case FILTERS.COMBINED:
          return convertCombinedFilter(normalizedFilter, baseProperties);

        case FILTERS.SPATIAL_FILTER:
          return convertSpatialFilter(normalizedFilter, baseProperties);

        case FILTERS.MATCH_ALL:
        case FILTERS.QUERY_STRING:
        default:
          return convertToDSLFilter(normalizedFilter, baseProperties);
      }
    }

    // FALLBACK: No meta.type - preserve as DSL to avoid data loss
    return convertToDSLFilter(normalizedFilter, baseProperties);
  } catch (error) {
    logger?.warn(`Failed to convert stored filter: ${error.message}`);
    return;
  }
}

/**
 * Convert stored filter to simple condition
 * Extracts field, operator, and value from filter metadata and query structures
 * Used by type-specific converters and as a helper for group conversion
 */
function convertToSimpleCondition(storedFilter: StoredFilter): AsCodeConditionFilter['condition'] {
  const meta = storedFilter.meta || {};
  const query = storedFilter.query || {};

  // Extract field name - ExtendedFilter type includes optional 'field' property
  const field = meta.key || meta.field || extractFieldFromQuery(query);
  if (!field) {
    throw new FilterConversionError('Cannot determine field name from stored filter');
  }

  // Determine operator and value based on query structure
  if (hasExistsQuery(query)) {
    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.EXISTS,
      ...(meta.negate && { negate: true }),
    };
  }

  if (hasRangeQuery(query)) {
    const range = query.range[field] as Record<string, unknown>;
    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.RANGE,
      value: {
        ...(range.gte !== undefined && { gte: range.gte as number | string }),
        ...(range.lte !== undefined && { lte: range.lte as number | string }),
        ...(range.gt !== undefined && { gt: range.gt as number | string }),
        ...(range.lt !== undefined && { lt: range.lt as number | string }),
        ...(range.format !== undefined && { format: range.format as string }),
      },
      ...(meta.negate && { negate: true }),
    };
  }

  // Handle phrases filter: meta.type='phrases' with meta.params as array of values
  if (isPhrasesFilter(storedFilter)) {
    const values = meta.params as Array<string | number | boolean>;
    // Validate homogeneous array, fallback to custom DSL filter on failure
    validateHomogeneousArray(values, 'Phrases filter');

    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.IS_ONE_OF,
      value: values as string[] | number[] | boolean[],
      ...(meta.negate && { negate: true }),
    };
  }

  if (query.match_phrase) {
    const phraseField = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[phraseField];
    return {
      field: phraseField, // Use the field from the query, not meta
      operator: ASCODE_FILTER_OPERATOR.IS,
      value: typeof value === 'object' ? value.query : value,
      ...(meta.negate && { negate: true }),
    };
  }
  // Fallback - try to extract from meta.params
  const params = meta.params as { query?: unknown } | undefined;
  if (params && typeof params === 'object' && 'query' in params && params.query !== undefined) {
    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.IS,
      value: params.query as string | number | boolean,
      ...(meta.negate && { negate: true }),
    };
  }

  throw new FilterConversionError(`Unsupported query structure: ${JSON.stringify(query)}`);
}

/**
 * Convert stored filter to filter group
 * Handles combined filters (meta.type='combined') with proper meta.params structure
 * Recursively converts nested filters to preserve group structure
 */
function convertToFilterGroup(storedFilter: StoredFilter): AsCodeGroupFilter['group'] {
  if (!isCombinedFilter(storedFilter)) {
    throw new FilterConversionError('Combined filter must have valid meta.params array structure');
  }

  // ExtendedFilter type includes optional 'relation' property
  // Note: relation can be 'or'/'OR' or 'and'/'AND' - normalize to lowercase
  const operator = storedFilter.meta.relation?.toString().toLowerCase() === 'or' ? 'or' : 'and';

  // isCombinedFilter already validated params is a non-empty Filter[] array
  const params = storedFilter.meta.params as StoredFilter[];

  const conditions = params.map((param) => {
    // Each param is itself a complete stored filter
    // Recursively convert it to get the condition or group
    const paramFilter = fromStoredFilter(param);

    // Extract just the condition or group from the converted filter
    if (paramFilter && 'condition' in paramFilter && paramFilter.condition) {
      return paramFilter.condition;
    }
    if (paramFilter && 'group' in paramFilter && paramFilter.group) {
      return paramFilter.group;
    }
    // If it's a DSL filter, we can't convert it to a condition
    throw new FilterConversionError('Cannot convert combined filter param to condition');
  });

  return {
    operator,
    conditions: conditions as AsCodeGroupFilter['group']['conditions'],
  };
}

/**
 * Convert stored filter to DSL format (fallback)
 * Used when filter cannot be converted to condition or group format
 * Preserves original query structure to prevent data loss
 */
function convertToRawDSL(storedFilter: StoredFilter): AsCodeDSLFilter['dsl'] {
  if (!storedFilter.query) {
    throw new FilterConversionError('Cannot convert to DSL: filter has no query property');
  }
  return {
    query: storedFilter.query,
  };
}

/**
 * Extract field name from query object (for filters without meta.key)
 */
function extractFieldFromQuery(query: unknown): string | null {
  if (!query || typeof query !== 'object') return null;

  if (hasTermQuery(query)) {
    return Object.keys(query.term)[0] || null;
  }
  if (hasTermsQuery(query)) {
    return Object.keys(query.terms)[0] || null;
  }
  if (hasRangeQuery(query)) {
    return Object.keys(query.range)[0] || null;
  }
  if (hasExistsQuery(query)) {
    return query.exists.field || null;
  }
  if (hasMatchQuery(query)) {
    return Object.keys(query.match)[0] || null;
  }
  if (hasMatchPhraseQuery(query)) {
    return Object.keys(query.match_phrase)[0] || null;
  }
  return null;
}

/**
 * TYPE-SPECIFIC CONVERTERS
 * Each function handles a specific FILTERS enum type
 */

function convertCustomFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeDSLFilter {
  const meta = filter.meta;
  return {
    ...baseProperties,
    type: ASCODE_FILTER_TYPE.DSL,
    dsl: convertToRawDSL(filter),
    ...(meta?.field || meta?.key ? { field: meta.field || meta.key } : {}),
    // Only preserve params for non-combined filters (combined filters use params differently)
    ...(meta?.params && meta?.type !== 'combined' ? { params: meta.params } : {}),
  };
}

function convertPhraseFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeConditionFilter | AsCodeDSLFilter {
  // Check if query is compatible with condition conversion
  // Script queries should be preserved as DSL even if meta.type='phrase'
  if (filter.query && typeof filter.query === 'object' && 'script' in filter.query) {
    return convertCustomFilter(filter, baseProperties);
  }

  try {
    const condition = convertToSimpleCondition(filter);
    return {
      ...baseProperties,
      type: 'condition',
      condition,
    } as AsCodeConditionFilter;
  } catch (error) {
    // If conversion fails, fall back to DSL
    return convertCustomFilter(filter, baseProperties);
  }
}

function convertPhrasesFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeConditionFilter | AsCodeDSLFilter {
  try {
    const condition = convertToSimpleCondition(filter);
    return {
      ...baseProperties,
      type: ASCODE_FILTER_TYPE.CONDITION,
      condition,
    } as AsCodeConditionFilter;
  } catch (error) {
    // If conversion fails, fall back to DSL
    return convertCustomFilter(filter, baseProperties);
  }
}

function convertRangeFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeConditionFilter | AsCodeDSLFilter {
  // Check if query is compatible with condition conversion
  // Script queries should be preserved as DSL even if meta.type='range'
  if (filter.query && typeof filter.query === 'object' && 'script' in filter.query) {
    return convertCustomFilter(filter, baseProperties);
  }

  try {
    const condition = convertToSimpleCondition(filter);
    return {
      ...baseProperties,
      type: ASCODE_FILTER_TYPE.CONDITION,
      condition,
    } as AsCodeConditionFilter;
  } catch (error) {
    // If conversion fails, fall back to DSL
    return convertCustomFilter(filter, baseProperties);
  }
}

function convertExistsFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeConditionFilter | AsCodeDSLFilter {
  try {
    const condition = convertToSimpleCondition(filter);
    return {
      ...baseProperties,
      type: ASCODE_FILTER_TYPE.CONDITION,
      condition,
    } as AsCodeConditionFilter;
  } catch (error) {
    // If conversion fails, fall back to DSL
    return convertCustomFilter(filter, baseProperties);
  }
}

function convertCombinedFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeGroupFilter | AsCodeDSLFilter {
  try {
    const group = convertToFilterGroup(filter);
    return {
      ...baseProperties,
      type: ASCODE_FILTER_TYPE.GROUP,
      group,
    };
  } catch (error) {
    // If conversion fails, fall back to DSL
    return convertCustomFilter(filter, baseProperties);
  }
}

/**
 * Convert spatial filters
 * Similar to DSL but maintains type='spatial' to preserve FILTERS.SPATIAL_FILTER in round-trip
 */
function convertSpatialFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeSpatialFilter {
  return {
    ...baseProperties,
    type: ASCODE_FILTER_TYPE.SPATIAL,
    dsl: convertToRawDSL(filter),
  };
}

/**
 * Convert filters that are always preserved as DSL
 * Used for: match_all, query_string, etc.
 */
function convertToDSLFilter(
  filter: StoredFilter,
  baseProperties: Partial<AsCodeFilter>
): AsCodeDSLFilter {
  return {
    ...baseProperties,
    type: ASCODE_FILTER_TYPE.DSL,
    dsl: convertToRawDSL(filter),
    ...(filter.meta?.field ? { field: filter.meta.field } : {}),
    // Only preserve params for non-combined filters (combined filters use params differently)
    ...(filter.meta?.params && filter.meta?.type !== 'combined'
      ? { params: filter.meta.params }
      : {}),
  };
}

/**
 * Extract base properties from stored filter
 */
function extractBaseProperties(storedFilter: StoredFilter): Partial<AsCodeFilter> {
  const meta = storedFilter.meta;

  return {
    ...(meta?.disabled !== undefined ? { disabled: meta.disabled } : {}),
    ...(meta?.controlledBy !== undefined ? { controlled_by: meta.controlledBy } : {}),
    ...(meta?.index !== undefined ? { data_view_id: meta.index } : {}),
    ...(meta?.negate !== undefined ? { negate: meta.negate } : {}),
    ...(meta?.alias != null ? { label: meta.alias } : {}),
    ...(meta?.isMultiIndex !== undefined ? { is_multi_index: meta.isMultiIndex } : {}),
  };
}

/**
 * Validate that an array contains values of a single type (homogeneous)
 * @throws FilterConversionError if array contains mixed types
 */
function validateHomogeneousArray(values: Array<string | number | boolean>, context: string): void {
  if (values.length > 0) {
    const firstType = typeof values[0];
    const isHomogeneous = values.every((v) => typeof v === firstType);

    if (!isHomogeneous) {
      throw new FilterConversionError(
        `${context} must have homogeneous value types, got mixed types: ${values
          .map((v) => typeof v)
          .join(', ')}`
      );
    }
  }
}

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
export function fromStoredFilters(
  filters: unknown[] | undefined,
  logger?: Logger
): AsCodeFilter[] | undefined {
  return filters
    ?.map((f) => fromStoredFilter(f, logger))
    .filter((f): f is AsCodeFilter => f !== undefined);
}
