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
  AsCodeSpatialFilter,
} from '@kbn/as-code-filters-schema';
import type { Logger } from '@kbn/logging';
import { ASCODE_FILTER_OPERATOR } from '@kbn/as-code-filters-constants';
import { FILTERS, getFilterField } from '@kbn/es-query';
import { FilterConversionError } from './errors';
import type { StoredFilter } from './types';
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isSpatialFilter,
  isGroupCondition,
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

    if (isSpatialFilter(filter)) {
      return convertFromSpatialFilter(filter, storedFilter);
    }
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
    const format = condition.value.format;

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
        params: rangeQuery,
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
    const filter = isGroupCondition(typedCondition)
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
      relation: group.operator.toUpperCase(),
      params: filterParams,
    },
  };
}

/**
 * Convert spatial filter to stored filter with FILTERS.SPATIAL_FILTER type
 */
function convertFromSpatialFilter(
  asCodeFilter: AsCodeSpatialFilter,
  baseStored: StoredFilter
): StoredFilter {
  return {
    ...baseStored,
    query: asCodeFilter.dsl.query,
    meta: {
      ...baseStored.meta,
      type: FILTERS.SPATIAL_FILTER,
    },
  };
}

/**
 * Convert DSL filter to stored filter with FILTERS.CUSTOM type
 */
function convertFromDSLFilter(
  asCodeFilter: AsCodeDSLFilter,
  baseStored: StoredFilter
): StoredFilter {
  const query = asCodeFilter.dsl.query;

  // Build a filter to test with type guard functions
  const dslFilter: StoredFilter = {
    ...baseStored,
    query,
  };

  // Extract field name using utility function (returns undefined for filters without a field)
  const detectedField = getFilterField(dslFilter);
  // Use detected field or fall back to asCodeFilter.field
  const field = detectedField ?? asCodeFilter.field;

  return {
    ...baseStored,
    query,
    meta: {
      ...baseStored.meta,
      type: FILTERS.CUSTOM,
      ...(field ? { field } : {}),
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
