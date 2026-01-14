/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting AsCodeFilter to stored filter format
 */

import type {
  AsCodeFilter,
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
} from '@kbn/as-code-filters-schema';
import type { Logger } from '@kbn/logging';
import { ASCODE_FILTER_OPERATOR } from '@kbn/as-code-filters-constants';
import { FILTERS } from '@kbn/es-query';
import { FilterConversionError } from './errors';
import type { StoredFilter } from './types';
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isNestedFilterGroup,
  isAsCodeFilter,
} from './type_guards';

/**
 * Get stored filter type name for operator
 */
function getFilterTypeForOperator(operator: string): string {
  switch (operator) {
    case ASCODE_FILTER_OPERATOR.EXISTS:
      return FILTERS.EXISTS;
    case ASCODE_FILTER_OPERATOR.RANGE:
      return FILTERS.RANGE;
    case ASCODE_FILTER_OPERATOR.IS_ONE_OF:
      return FILTERS.PHRASES;
    case ASCODE_FILTER_OPERATOR.IS:
      return FILTERS.PHRASE;
    default:
      return FILTERS.PHRASE;
  }
}

/**
 * Resolve whether a filter should be negated based on top-level and condition-level values.
 *
 * Hierarchical rule: top-level `negate` takes precedence when defined; otherwise
 * fall back to `condition.negate`. Returns a boolean indicating final negation.
 */
function resolveNegate(baseNegate?: boolean, conditionNegate?: boolean): boolean {
  return baseNegate ?? !!conditionNegate;
}

/**
 * Convert AsCodeFilter to stored Filter
 *
 * @param filter The AsCodeFilter to convert
 * @param logger Optional logger for warnings
 * @returns StoredFilter or undefined if conversion fails
 */
export function toStoredFilter(filter: AsCodeFilter, logger?: Logger): StoredFilter | undefined {
  try {
    // Validate filter structure - must have exactly one of: condition, group, or dsl
    if (!isAsCodeFilter(filter)) {
      throw new FilterConversionError(
        'Invalid AsCodeFilter: must have exactly one of condition, group, or dsl'
      );
    }

    // Build base stored filter structure
    // Only include properties that are explicitly set in AsCodeFilter (minimize round-trip differences)
    // Note: $state.store (pinned) is not included as it's UI state only
    const storedFilter: StoredFilter = {
      meta: {
        ...(filter.label !== undefined ? { alias: filter.label } : {}),
        ...(filter.disabled !== undefined ? { disabled: filter.disabled } : {}),
        ...('negate' in filter && filter.negate !== undefined ? { negate: filter.negate } : {}),
        ...('controlled_by' in filter && filter.controlled_by !== undefined
          ? { controlledBy: filter.controlled_by }
          : {}),
        ...('data_view_id' in filter && filter.data_view_id !== undefined
          ? { index: filter.data_view_id }
          : {}),
        ...('is_multi_index' in filter && filter.is_multi_index !== undefined
          ? { isMultiIndex: filter.is_multi_index }
          : {}),
        ...('filter_type' in filter && filter.filter_type !== undefined
          ? { type: filter.filter_type }
          : {}),
        ...(filter.key !== undefined ? { key: filter.key } : {}),
        ...(filter.value !== undefined ? { value: filter.value } : {}),
      },
    };

    // Convert based on filter type using type guards
    if (isConditionFilter(filter)) {
      return convertFromSimpleCondition(filter.condition, storedFilter);
    }

    if (isGroupFilter(filter)) {
      return convertFromFilterGroup(filter.group, storedFilter);
    }

    if (isDSLFilter(filter)) {
      return convertFromDSLFilter(filter, storedFilter);
    }

    throw new FilterConversionError(
      'AsCodeFilter must have exactly one of: condition, group, or dsl'
    );
  } catch (error) {
    logger?.warn(`Failed to convert AsCodeFilter to stored filter: ${error.message}`);
    return;
  }
}

/**
 * Convert simple condition to stored filter
 */
function convertFromSimpleCondition(
  condition: AsCodeConditionFilter['condition'],
  baseStored: StoredFilter
): StoredFilter {
  // Base meta that all operators share
  // Extract negate from baseStored.meta to handle separately (for precedence)
  const { negate: baseNegate, ...baseMetaWithoutNegate } = baseStored.meta;
  const baseMeta = {
    ...baseMetaWithoutNegate,
    key: condition.field,
    field: condition.field,
    type: getFilterTypeForOperator(condition.operator),
  };

  const shouldNegate = resolveNegate(baseNegate, condition.negate);

  // EXISTS
  if (condition.operator === ASCODE_FILTER_OPERATOR.EXISTS) {
    return {
      ...baseStored,
      query: { exists: { field: condition.field } },
      meta: {
        ...baseMeta,
        ...(shouldNegate ? { negate: true } : {}),
      },
    };
  }

  // IS
  if (condition.operator === ASCODE_FILTER_OPERATOR.IS) {
    return {
      ...baseStored,
      query: {
        match_phrase: {
          [condition.field]: condition.value,
        },
      },
      meta: {
        ...baseMeta,
        params: { query: condition.value },
        ...(shouldNegate ? { negate: true } : {}),
      },
    };
  }

  // IS_ONE_OF
  if (condition.operator === ASCODE_FILTER_OPERATOR.IS_ONE_OF) {
    return {
      ...baseStored,
      query: {
        bool: {
          should: (condition.value as Array<string | number | boolean>).map((value) => ({
            match_phrase: {
              [condition.field]: value,
            },
          })),
          minimum_should_match: 1,
        },
      },
      meta: {
        ...baseMeta,
        type: 'phrases',
        key: condition.field,
        field: condition.field,
        params: condition.value,
        ...(shouldNegate ? { negate: true } : {}),
      },
    };
  }

  // RANGE
  if (condition.operator === ASCODE_FILTER_OPERATOR.RANGE) {
    // Extract format from condition if available
    const format = 'format' in condition.value ? condition.value.format : undefined;

    // Build range query, including format if present
    const rangeQuery = {
      ...(condition.value.gte !== undefined && { gte: condition.value.gte }),
      ...(condition.value.lte !== undefined && { lte: condition.value.lte }),
      ...(condition.value.gt !== undefined && { gt: condition.value.gt }),
      ...(condition.value.lt !== undefined && { lt: condition.value.lt }),
      ...(format && { format }),
    };

    return {
      ...baseStored,
      query: { range: { [condition.field]: rangeQuery } },
      meta: {
        ...baseMeta,
        params: {
          ...(condition.value.gte !== undefined && { gte: condition.value.gte }),
          ...(condition.value.lte !== undefined && { lte: condition.value.lte }),
          ...(condition.value.gt !== undefined && { gt: condition.value.gt }),
          ...(condition.value.lt !== undefined && { lt: condition.value.lt }),
          ...(format && { format }),
        },
        ...(shouldNegate ? { negate: true } : {}),
      },
    };
  }

  // Unsupported operator
  throw new FilterConversionError(
    `Unsupported operator: ${(condition as AsCodeConditionFilter['condition']).operator}`
  );
}

/**
 * Convert filter group to stored filter
 */
function convertFromFilterGroup(
  group: AsCodeGroupFilter['group'],
  baseStored: StoredFilter
): StoredFilter {
  // Standard group filter conversion - use combined filter format
  const filterParams = group.conditions.map((condition) => {
    const typedCondition = condition as
      | AsCodeConditionFilter['condition']
      | AsCodeGroupFilter['group'];

    // Create a clean base for sub-filters
    // Sub-filters inherit index and $state when present
    const cleanBase = {
      ...(baseStored.$state ? { $state: baseStored.$state } : {}),
      meta: {
        ...(baseStored.meta.index ? { index: baseStored.meta.index } : {}),
      },
    };

    // Convert condition to a complete filter
    const filter = isNestedFilterGroup(typedCondition)
      ? convertFromFilterGroup(typedCondition, cleanBase)
      : convertFromSimpleCondition(typedCondition, cleanBase);

    // Clean up filter: remove $state, alias, and disabled from all sub-filters
    const { $state, meta: filterMeta, ...cleanedUpFilter } = filter;
    const { alias, disabled, ...cleanedUpMeta } = filterMeta;
    return { ...cleanedUpFilter, meta: cleanedUpMeta };
  });

  // Combined filters don't have a query property - filters are in meta.params
  return {
    ...baseStored,
    meta: {
      ...baseStored.meta,
      type: FILTERS.COMBINED,
      relation: group.type.toUpperCase(),
      params: filterParams,
    },
  };
}

/**
 * Convert DSL filter to stored filter with smart type detection
 */
function convertFromDSLFilter(
  asCodeFilter: AsCodeDSLFilter,
  baseStored: StoredFilter
): StoredFilter {
  const dsl = asCodeFilter.dsl;

  // Use preserved filterType if available
  if (baseStored.meta.type) {
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        // Restore meta.field and meta.params from AsCodeDSLFilter if available
        // This is critical for scripted filters where field cannot be extracted from query
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
        ...(asCodeFilter.params ? { params: asCodeFilter.params } : {}),
      },
    };
  }

  // Detect type from query structure
  // Check if this is a phrase filter (match_phrase)
  if (dsl.query.match_phrase) {
    const field = Object.keys(dsl.query.match_phrase)[0];
    const value = dsl.query.match_phrase[field];
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type: FILTERS.PHRASE,
        params: { query: typeof value === 'object' ? value.query || value : value },
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      },
    };
  }

  // Check if this is a phrase-type match query
  if (dsl.query.match) {
    const field = Object.keys(dsl.query.match)[0];
    const config = dsl.query.match[field];

    if (typeof config === 'object' && config.type === 'phrase') {
      return {
        ...baseStored,
        query: dsl.query,
        meta: {
          ...baseStored.meta,
          type: FILTERS.PHRASE,
          params: { query: config.query },
          ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
        },
      };
    }
  }

  // Check if this is a term query
  if (dsl.query.term) {
    const field = Object.keys(dsl.query.term)[0];
    const value = dsl.query.term[field];
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type: FILTERS.PHRASE,
        params: { query: value },
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      },
    };
  }

  // Check if this is a range query
  if (dsl.query.range) {
    const field = Object.keys(dsl.query.range)[0];
    const rangeParams = dsl.query.range[field];

    // Detect RANGE_FROM_VALUE (single-bound range) vs regular RANGE (multi-bound)
    let type = FILTERS.RANGE;
    if (rangeParams && typeof rangeParams === 'object') {
      const boundCount = ['gte', 'lte', 'gt', 'lt'].filter((k) => k in rangeParams).length;
      if (boundCount === 1) {
        type = FILTERS.RANGE_FROM_VALUE;
      }
    }

    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type,
        params: rangeParams,
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      },
    };
  }

  // Check if this is an exists query
  if (dsl.query.exists) {
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type: FILTERS.EXISTS,
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
        ...(asCodeFilter.params ? { params: asCodeFilter.params } : {}),
      },
    };
  }

  // Check if this is a match_all query
  if (dsl.query.match_all) {
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type: FILTERS.MATCH_ALL,
        params: dsl.query.match_all,
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      },
    };
  }

  // Check if this is a query_string query
  if (dsl.query.query_string) {
    return {
      ...baseStored,
      query: dsl.query,
      meta: {
        ...baseStored.meta,
        type: FILTERS.QUERY_STRING,
        params: dsl.query.query_string,
        ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      },
    };
  }

  // Check if this is a spatial filter (geo queries wrapped in bool)
  if (dsl.query.bool) {
    const { should, must, filter: boolFilter } = dsl.query.bool;
    const allClauses = [
      ...(Array.isArray(should) ? should : []),
      ...(Array.isArray(must) ? must : []),
      ...(Array.isArray(boolFilter) ? boolFilter : []),
    ];

    // Check if any clause contains geo queries
    const hasGeoQuery = allClauses.some(
      (clause) =>
        clause &&
        typeof clause === 'object' &&
        ('geo_shape' in clause || 'geo_bounding_box' in clause || 'geo_distance' in clause)
    );

    if (hasGeoQuery) {
      return {
        ...baseStored,
        query: dsl.query,
        meta: {
          ...baseStored.meta,
          type: FILTERS.SPATIAL_FILTER,
          ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
          ...(asCodeFilter.params ? { params: asCodeFilter.params } : {}),
        },
      };
    }
  }

  // Default: custom filter
  return {
    ...baseStored,
    query: dsl.query,
    meta: {
      ...baseStored.meta,
      type: FILTERS.CUSTOM,
      ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      ...(asCodeFilter.params ? { params: asCodeFilter.params } : {}),
    },
  };
}

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
export function toStoredFilters(
  filters: AsCodeFilter[] | undefined,
  logger?: Logger
): StoredFilter[] | undefined {
  return filters
    ?.map((f) => toStoredFilter(f, logger))
    .filter((f): f is StoredFilter => f !== undefined);
}
