/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting SimplifiedFilter to stored filter format
 */

import type {
  Filter as StoredFilter,
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
  RangeValue,
} from '@kbn/es-query-server';
import type { Serializable } from '@kbn/utility-types';
import { FilterStateStore } from '../../..';
import { FilterConversionError } from '../errors';
import { getFilterTypeForOperator } from './utils';
import { isConditionFilter, isGroupFilter, isDSLFilter, isNestedFilterGroup } from './type_guards';
import { validateSimplifiedFilter } from './validation';

/**
 * Convert SimplifiedFilter to stored Filter for runtime compatibility
 */
export function toStoredFilter(simplified: SimplifiedFilter): StoredFilter {
  try {
    validateSimplifiedFilter(simplified);

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
        index: simplified.indexPattern,
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
      'SimplifiedFilter must have exactly one of: condition, group, or dsl'
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
  condition: SimpleFilterCondition,
  baseStored: StoredFilter
): StoredFilter {
  // Build query and meta based on operator
  let query: Record<string, any>;
  let meta: Serializable = {
    ...baseStored.meta,
    key: condition.field,
    field: condition.field,
    type: getFilterTypeForOperator(condition.operator),
  };

  switch (condition.operator) {
    case 'exists':
      query = { exists: { field: condition.field } };
      break;

    case 'not_exists':
      query = { exists: { field: condition.field } };
      meta = { ...meta, negate: true };
      break;

    case 'is':
      query = { term: { [condition.field]: condition.value } };
      meta = { ...meta, params: { query: condition.value } };
      break;

    case 'is_not':
      query = { term: { [condition.field]: condition.value } };
      meta = { ...meta, negate: true, params: { query: condition.value } };
      break;

    case 'is_one_of':
      query = { terms: { [condition.field]: condition.value } };
      meta = { ...meta, params: { terms: condition.value } };
      break;

    case 'is_not_one_of':
      query = { terms: { [condition.field]: condition.value } };
      meta = { ...meta, negate: true, params: { terms: condition.value } };
      break;

    case 'range':
      const rangeValue = condition.value as RangeValue;
      query = { range: { [condition.field]: rangeValue } };
      meta = { ...meta, params: rangeValue };
      break;

    default:
      // @ts-expect-error - This should never happen due to validation constraints
      throw new FilterConversionError(`Unsupported operator: ${condition.operator}`);
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
export function convertFromFilterGroup(group: FilterGroup, baseStored: StoredFilter): StoredFilter {
  const meta = {
    ...baseStored.meta,
  };

  // Convert conditions to query clauses
  const clauses = group.conditions.map((condition) => {
    const typedCondition = condition as SimpleFilterCondition | FilterGroup;
    if (isNestedFilterGroup(typedCondition)) {
      // Nested group - recursively convert
      const nestedStored = convertFromFilterGroup(typedCondition, baseStored);
      return nestedStored.query;
    } else {
      // Simple condition
      const conditionStored = convertFromSimpleCondition(typedCondition, baseStored);
      return conditionStored.query;
    }
  });

  // Build bool query
  const boolQuery: any = {};
  boolQuery[group.type === 'AND' ? 'must' : 'should'] = clauses;

  if (group.type === 'OR') {
    boolQuery.minimum_should_match = 1;
  }

  return {
    ...baseStored,
    query: { bool: boolQuery },
    meta,
  };
}

/**
 * Convert DSL filter to stored filter
 */
export function convertFromDSLFilter(dsl: RawDSLFilter, baseStored: StoredFilter): StoredFilter {
  const meta = {
    ...baseStored.meta,
    type: 'custom',
  };

  return {
    ...baseStored,
    query: dsl.query,
    meta,
  };
}
