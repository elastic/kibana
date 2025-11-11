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
import { SIMPLE_FILTER_OPERATOR } from '@kbn/es-query-constants';
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
        controlledBy: simplified.controlledBy,
        index: simplified.dataViewId,
        // Preserve metadata properties for round-trip compatibility
        isMultiIndex: simplified.isMultiIndex,
        type: simplified.filterType,
        key: simplified.key,
        value: simplified.value,
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
      return convertFromDSLFilter(simplified.dsl, storedFilter);
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
  // Build query and meta based on operator
  let query: Record<string, unknown>;
  let meta: Record<string, unknown> = {
    ...baseStored.meta,
    key: condition.field,
    field: condition.field,
    type: getFilterTypeForOperator(condition.operator),
  };

  switch (condition.operator) {
    case SIMPLE_FILTER_OPERATOR.EXISTS:
      query = { exists: { field: condition.field } };
      break;

    case SIMPLE_FILTER_OPERATOR.NOT_EXISTS:
      query = { exists: { field: condition.field } };
      meta = { ...meta, negate: true };
      break;

    case SIMPLE_FILTER_OPERATOR.IS:
      // Use match_phrase for better compatibility with original filters
      query = {
        match_phrase: {
          [condition.field]: condition.value,
        },
      };
      meta = { ...meta, params: { query: condition.value } };
      break;

    case SIMPLE_FILTER_OPERATOR.IS_NOT:
      // Use match_phrase for better compatibility with original filters
      query = {
        match_phrase: {
          [condition.field]: condition.value,
        },
      };
      meta = { ...meta, negate: true, params: { query: condition.value } };
      break;

    case SIMPLE_FILTER_OPERATOR.IS_ONE_OF:
      query = { terms: { [condition.field]: condition.value } };
      meta = { ...meta, params: { terms: condition.value } };
      break;

    case SIMPLE_FILTER_OPERATOR.IS_NOT_ONE_OF:
      query = { terms: { [condition.field]: condition.value } };
      meta = { ...meta, negate: true, params: { terms: condition.value } };
      break;

    case SIMPLE_FILTER_OPERATOR.RANGE:
      const rangeValue = condition.value as {
        gte?: number | string;
        lte?: number | string;
        gt?: number | string;
        lt?: number | string;
      };

      // Build range query, preserving format for timestamp fields
      const rangeQuery: Record<string, unknown> = { ...rangeValue };
      if (condition.field === '@timestamp') {
        rangeQuery.format = 'strict_date_optional_time';
      }

      query = { range: { [condition.field]: rangeQuery } };

      // Only put range values (not format) in meta.params
      const paramsValue: Record<string, unknown> = {};
      if (rangeValue.gte !== undefined) paramsValue.gte = rangeValue.gte;
      if (rangeValue.lte !== undefined) paramsValue.lte = rangeValue.lte;
      if (rangeValue.gt !== undefined) paramsValue.gt = rangeValue.gt;
      if (rangeValue.lt !== undefined) paramsValue.lt = rangeValue.lt;

      meta = { ...meta, params: paramsValue };
      break;

    default:
      throw new FilterConversionError(
        `Unsupported operator: ${(condition as AsCodeConditionFilter['condition']).operator}`
      );
  }

  return {
    ...baseStored,
    query,
    meta,
  };
}

/**
 * Convert filter group to stored filter
 */
export function convertFromFilterGroup(
  group: AsCodeGroupFilter['group'],
  baseStored: StoredFilter
): StoredFilter {
  // Check if this is a phrases filter (OR group with same-field conditions)
  const isPhrasesFilter =
    group.type === 'or' &&
    group.conditions.length > 1 &&
    group.conditions.every((condition) => {
      const typedCondition = condition as AsCodeConditionFilter['condition'];
      return (
        'field' in typedCondition &&
        'operator' in typedCondition &&
        typedCondition.field ===
          (group.conditions[0] as AsCodeConditionFilter['condition']).field &&
        typedCondition.operator === SIMPLE_FILTER_OPERATOR.IS
      );
    });

  let meta = {
    ...baseStored.meta,
  };

  if (isPhrasesFilter) {
    // Handle as phrases filter
    const field = (group.conditions[0] as AsCodeConditionFilter['condition']).field;
    const values = group.conditions
      .map((condition) => {
        const typedCondition = condition as AsCodeConditionFilter['condition'];
        return 'value' in typedCondition ? typedCondition.value : undefined;
      })
      .filter(Boolean);

    meta = {
      ...meta,
      key: field,
      type: 'phrases',
      params: values,
    };

    // Build match_phrase queries for each value
    const clauses = values.map((value) => ({
      match_phrase: {
        [field]: value,
      },
    }));

    const boolQuery: Record<string, unknown> = {
      should: clauses,
      minimum_should_match: 1,
    };

    return {
      ...baseStored,
      query: { bool: boolQuery },
      meta,
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

  // Create combined filter format with meta.params
  meta = {
    ...meta,
    type: 'combined',
    relation: group.type,
    params: filterParams,
  } as typeof meta & { relation: 'and' | 'or'; params: StoredFilter[] };

  // Combined filters don't have a query property - filters are in meta.params
  return {
    ...baseStored,
    meta,
  };
}

/**
 * Convert DSL filter to stored filter with smart type detection
 */
export function convertFromDSLFilter(
  dsl: AsCodeDSLFilter['dsl'],
  baseStored: StoredFilter
): StoredFilter {
  // Use preserved filterType if available, otherwise detect from query structure
  let type = baseStored.meta.type || 'custom';
  let params: Record<string, unknown> | undefined;

  // Only perform type detection if no preserved type exists
  if (!baseStored.meta.type) {
    // Check if this is actually a phrase filter in DSL form
    if (dsl.query.match_phrase) {
      type = 'phrase';
      const field = Object.keys(dsl.query.match_phrase)[0];
      const value = dsl.query.match_phrase[field];
      params = { query: typeof value === 'object' ? value.query || value : value };
    } else if (dsl.query.match) {
      const field = Object.keys(dsl.query.match)[0];
      const config = dsl.query.match[field];

      // Check if this is a phrase-type match query
      if (typeof config === 'object' && config.type === 'phrase') {
        type = 'phrase';
        params = { query: config.query };
      }
    } else if (dsl.query.term) {
      type = 'phrase';
      const field = Object.keys(dsl.query.term)[0];
      const value = dsl.query.term[field];
      params = { query: value };
    } else if (dsl.query.terms) {
      type = 'phrases';
      const field = Object.keys(dsl.query.terms)[0];
      const values = dsl.query.terms[field];
      params = values;
    } else if (dsl.query.range) {
      type = 'range';
      const field = Object.keys(dsl.query.range)[0];
      const rangeParams = dsl.query.range[field];
      params = rangeParams;

      // Detect RANGE_FROM_VALUE (single-bound range) vs regular RANGE (multi-bound)
      if (rangeParams && typeof rangeParams === 'object') {
        const boundCount = ['gte', 'lte', 'gt', 'lt'].filter((k) => k in rangeParams).length;
        if (boundCount === 1) {
          type = 'range_from_value';
        }
      }
    } else if (dsl.query.exists) {
      type = 'exists';
    } else if (dsl.query.match_all) {
      // Detect MATCH_ALL filter
      type = 'match_all';
      params = dsl.query.match_all;
    } else if (dsl.query.query_string) {
      // Detect QUERY_STRING filter
      type = 'query_string';
      params = dsl.query.query_string;
    } else if (dsl.query.bool) {
      // Detect SPATIAL_FILTER (geo_shape queries wrapped in bool.should)
      // Spatial filters typically have a bool.should with geo_shape or geo_bounding_box queries
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
        type = 'spatial_filter';
        // Don't set params - preserve the original bool query structure
      }
    }
  }

  const meta = {
    ...baseStored.meta,
    type,
    ...(params ? { params } : {}),
  };

  return {
    ...baseStored,
    query: dsl.query,
    meta,
  };
}
