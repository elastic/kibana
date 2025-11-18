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
} from '@kbn/es-query-server';
import { ASCODE_FILTER_OPERATOR } from '@kbn/es-query-constants';
import { FilterStateStore } from '../..';
import { FilterConversionError } from './errors';
import { getFilterTypeForOperator } from './utils';
import type { StoredFilter } from './types';
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isNestedFilterGroup,
  isAsCodeFilter,
  isAsCodeConditionFilter,
} from './type_guards';

/**
 * Convert AsCodeFilter to stored Filter for runtime compatibility
 */
export function toStoredFilter(simplified: AsCodeFilter): StoredFilter {
  try {
    // Validate filter structure - must have exactly one of: condition, group, or dsl
    if (!isAsCodeFilter(simplified)) {
      throw new FilterConversionError(
        'Invalid AsCodeFilter: must have exactly one of condition, group, or dsl'
      );
    }

    // Build base stored filter structure
    const storedFilter: StoredFilter = {
      $state: {
        store: simplified.pinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
      },
      meta: {
        alias: simplified.label || null,
        disabled: simplified.disabled || false,
        negate: simplified.negate || false,
        // Only add optional properties if they have defined values (round-trip compatibility)
        ...(simplified.controlledBy !== undefined ? { controlledBy: simplified.controlledBy } : {}),
        ...(simplified.dataViewId !== undefined ? { index: simplified.dataViewId } : {}),
        ...(simplified.isMultiIndex !== undefined ? { isMultiIndex: simplified.isMultiIndex } : {}),
        ...(simplified.filterType !== undefined ? { type: simplified.filterType } : {}),
        ...(simplified.key !== undefined ? { key: simplified.key } : {}),
        ...(simplified.value !== undefined ? { value: simplified.value } : {}),
      },
    };

    // Convert based on filter type using type guards
    if (isConditionFilter(simplified)) {
      return convertFromSimpleCondition(simplified.condition, storedFilter);
    }

    if (isGroupFilter(simplified)) {
      return convertFromFilterGroup(simplified.group, storedFilter);
    }

    if (isDSLFilter(simplified)) {
      return convertFromDSLFilter(simplified, storedFilter);
    }

    throw new FilterConversionError(
      'AsCodeFilter must have exactly one of: condition, group, or dsl'
    );
  } catch (error) {
    if (error instanceof FilterConversionError) {
      throw error;
    }
    throw new FilterConversionError(
      `Failed to convert simplified filter: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Convert simple condition to stored filter
 */
export function convertFromSimpleCondition(
  condition: AsCodeConditionFilter['condition'],
  baseStored: StoredFilter
): StoredFilter {
  // Base meta that all operators share
  const baseMeta: Record<string, unknown> = {
    ...baseStored.meta,
    key: condition.field,
    field: condition.field,
    type: getFilterTypeForOperator(condition.operator),
  };

  // EXISTS / NOT_EXISTS
  if (
    condition.operator === ASCODE_FILTER_OPERATOR.EXISTS ||
    condition.operator === ASCODE_FILTER_OPERATOR.NOT_EXISTS
  ) {
    return {
      ...baseStored,
      query: { exists: { field: condition.field } },
      meta: {
        ...baseMeta,
        ...(condition.operator === ASCODE_FILTER_OPERATOR.NOT_EXISTS ? { negate: true } : {}),
      },
    };
  }

  // IS / IS_NOT
  if (
    condition.operator === ASCODE_FILTER_OPERATOR.IS ||
    condition.operator === ASCODE_FILTER_OPERATOR.IS_NOT
  ) {
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
        ...(condition.operator === ASCODE_FILTER_OPERATOR.IS_NOT ? { negate: true } : {}),
      },
    };
  }

  // IS_ONE_OF / IS_NOT_ONE_OF
  if (
    condition.operator === ASCODE_FILTER_OPERATOR.IS_ONE_OF ||
    condition.operator === ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF
  ) {
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
        ...(condition.operator === ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF ? { negate: true } : {}),
      },
    };
  }

  // RANGE
  if (condition.operator === ASCODE_FILTER_OPERATOR.RANGE) {
    // Determine format - use existing meta.params.format if available, otherwise default for @timestamp
    // TODO is setting the format necessary?
    const existingFormat =
      typeof baseStored.meta.params === 'object' &&
      baseStored.meta.params !== null &&
      'format' in baseStored.meta.params
        ? (baseStored.meta.params as { format?: string }).format
        : undefined;
    const format =
      existingFormat ||
      (condition.field === '@timestamp' ? 'strict_date_optional_time' : undefined);

    // Build range query, including format if present
    const rangeQuery = { ...condition.value, ...(format && { format }) };

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
export function convertFromFilterGroup(
  group: AsCodeGroupFilter['group'],
  baseStored: StoredFilter
): StoredFilter {
  // Check if this should be a phrases filter (OR group with same-field conditions)
  // Supports both positive (IS) and negated (IS_NOT) phrases filters
  const firstCondition = group.conditions[0];
  const shouldConvertToPhrasesFilter =
    group.type === 'or' &&
    group.conditions.length > 1 &&
    isAsCodeConditionFilter(firstCondition) &&
    group.conditions.every((condition) => {
      return (
        isAsCodeConditionFilter(condition) &&
        condition.field === firstCondition.field &&
        (condition.operator === ASCODE_FILTER_OPERATOR.IS ||
          condition.operator === ASCODE_FILTER_OPERATOR.IS_NOT)
      );
    });

  if (shouldConvertToPhrasesFilter) {
    const field = firstCondition.field;
    const isNegated = firstCondition.operator === ASCODE_FILTER_OPERATOR.IS_NOT;
    const values = group.conditions
      .map((condition) => {
        return isAsCodeConditionFilter(condition) && 'value' in condition
          ? condition.value
          : undefined;
      })
      .filter(Boolean);

    const boolQuery: Record<string, unknown> = {
      should: values.map((value) => ({
        match_phrase: {
          [field]: value,
        },
      })),
      minimum_should_match: 1,
    };

    return {
      ...baseStored,
      query: { bool: boolQuery },
      meta: {
        ...baseStored.meta,
        key: field,
        field, // Add field property for round-trip compatibility
        type: 'phrases',
        params: values,
        negate: isNegated, // Preserve negation from operator
      },
    };
  }

  // Standard group filter conversion - use combined filter format
  const filterParams = group.conditions.map((condition) => {
    const typedCondition = condition as
      | AsCodeConditionFilter['condition']
      | AsCodeGroupFilter['group'];

    // Create a clean base for sub-filters
    const cleanBase: StoredFilter = {
      $state: baseStored.$state,
      meta: {
        index: baseStored.meta.index,
        disabled: false,
        negate: false,
        alias: null,
      },
    };

    // Convert condition to a complete filter
    const filter = isNestedFilterGroup(typedCondition)
      ? convertFromFilterGroup(typedCondition, cleanBase)
      : convertFromSimpleCondition(typedCondition, cleanBase);

    // Clean up filter: remove $state, alias, and disabled from sub-filters
    const { $state, meta: filterMeta, ...cleanedUpFilter } = filter;
    const { alias, disabled, ...cleanedUpMeta } = filterMeta;
    return { ...cleanedUpFilter, meta: cleanedUpMeta };
  });

  // Combined filters don't have a query property - filters are in meta.params
  return {
    ...baseStored,
    meta: {
      ...baseStored.meta,
      type: 'combined',
      relation: group.type.toUpperCase(),
      params: filterParams,
    },
  };
}

/**
 * Convert DSL filter to stored filter with smart type detection
 */
export function convertFromDSLFilter(
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
        type: 'phrase',
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
          type: 'phrase',
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
        type: 'phrase',
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
    let type = 'range';
    if (rangeParams && typeof rangeParams === 'object') {
      const boundCount = ['gte', 'lte', 'gt', 'lt'].filter((k) => k in rangeParams).length;
      if (boundCount === 1) {
        type = 'range_from_value';
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
        type: 'exists',
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
        type: 'match_all',
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
        type: 'query_string',
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
          type: 'spatial_filter',
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
      type: 'custom',
      ...(asCodeFilter.field ? { field: asCodeFilter.field } : {}),
      ...(asCodeFilter.params ? { params: asCodeFilter.params } : {}),
    },
  };
}
