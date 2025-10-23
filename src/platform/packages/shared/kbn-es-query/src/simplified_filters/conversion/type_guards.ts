/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Type detection and guard functions for filter conversion
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
} from '@kbn/es-query-server';

// ====================================================================
// TIER DETECTION FUNCTIONS
// ====================================================================

/**
 * TIER 1: Full Compatibility - Can be directly converted to SimplifiedFilter
 */
export function isFullyCompatible(storedFilter: any): boolean {
  const meta = storedFilter.meta || {};

  // Simple phrase filter without complex query structure
  if (meta.type === 'phrase' && !storedFilter.query && meta.params) {
    return true;
  }

  // Basic exists filter without query structure
  if (meta.type === 'exists' && !storedFilter.query) {
    return true;
  }

  // Simple range filter without complex query structure
  if (meta.type === 'range' && !storedFilter.query && meta.params) {
    return true;
  }

  return false;
}

/**
 * TIER 2: Enhanced Compatibility - Can be parsed and simplified
 */
export function isEnhancedCompatible(storedFilter: any): boolean {
  // Check for simplifiable query structures
  if (storedFilter.query?.match_phrase || storedFilter.query?.match) {
    return true;
  }

  if (storedFilter.query?.range) {
    return true;
  }

  if (storedFilter.query?.exists) {
    return true;
  }

  // Legacy filter structures that can be migrated
  if (storedFilter.range && !storedFilter.query) {
    return true;
  }

  if (storedFilter.exists && !storedFilter.query) {
    return true;
  }

  return false;
}

/**
 * Detect if this represents a grouped filter with multiple conditions
 */
export function isStoredGroupFilter(storedFilter: any): boolean {
  return Boolean(
    storedFilter.query?.bool &&
      (storedFilter.query.bool.must?.length > 1 || storedFilter.query.bool.should?.length > 1)
  );
}

// ====================================================================
// TYPE GUARDS FOR SIMPLIFIED FILTERS
// ====================================================================

/**
 * Type guard to check if filter has a condition property
 */
export function isConditionFilter(
  filter: SimplifiedFilter
): filter is SimplifiedFilter & { condition: SimpleFilterCondition } {
  return 'condition' in filter && filter.condition !== undefined;
}

/**
 * Type guard to check if filter has a group property
 */
export function isGroupFilter(
  filter: SimplifiedFilter
): filter is SimplifiedFilter & { group: FilterGroup } {
  return 'group' in filter && filter.group !== undefined;
}

/**
 * Type guard to check if filter has a dsl property
 */
export function isDSLFilter(
  filter: SimplifiedFilter
): filter is SimplifiedFilter & { dsl: RawDSLFilter } {
  return 'dsl' in filter && filter.dsl !== undefined;
}

/**
 * Type guard to check if condition requires a value
 */
export function isConditionWithValue(
  condition: SimpleFilterCondition
): condition is SimpleFilterCondition & { value: any } {
  return !['exists', 'not_exists'].includes(condition.operator);
}

/**
 * Type guard to check if condition is existence-only
 */
export function isExistenceCondition(
  condition: SimpleFilterCondition
): condition is SimpleFilterCondition & { operator: 'exists' | 'not_exists' } {
  return ['exists', 'not_exists'].includes(condition.operator);
}

/**
 * Type guard to check if condition is a nested FilterGroup
 */
export function isNestedFilterGroup(
  condition: SimpleFilterCondition | FilterGroup
): condition is FilterGroup {
  return 'conditions' in condition && Array.isArray((condition as any).conditions);
}
