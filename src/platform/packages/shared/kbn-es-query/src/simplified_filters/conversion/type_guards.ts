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
 * Check if this is a phrase filter that can be converted to a simple condition
 */
export function isPhraseFilterWithQuery(storedFilter: any): boolean {
  // match_phrase queries that can be simplified to phrase conditions
  if (storedFilter.query?.match_phrase) {
    return true;
  }

  // match queries with phrase type that can be simplified
  if (storedFilter.query?.match) {
    const matchValues = Object.values(storedFilter.query.match);
    const isSimplePhrase = matchValues.some((value: any) => {
      return (
        typeof value === 'object' &&
        value !== null &&
        value.type === 'phrase' &&
        !value.analyzer &&
        !value.fuzziness &&
        !value.minimum_should_match
      );
    });
    if (isSimplePhrase) {
      return true;
    }
  }

  // meta.type indicates this should be treated as phrase filter
  if (storedFilter.meta?.type === 'phrase' && storedFilter.query) {
    return true;
  }

  return false;
}

/**
 * TIER 1.5: High-Fidelity Detection - Requires DSL preservation
 * Updated to exclude simple phrase filters
 */
export function requiresHighFidelity(storedFilter: any): boolean {
  // Simple phrase filters should be converted, not preserved
  if (isPhraseFilterWithQuery(storedFilter)) {
    return false;
  }

  // Complex match queries with advanced parameters still need DSL preservation
  if (storedFilter.query?.match) {
    const matchValues = Object.values(storedFilter.query.match);
    const hasComplexParams = matchValues.some((value: any) => {
      return (
        typeof value === 'object' &&
        value !== null &&
        (value.analyzer || value.fuzziness || value.minimum_should_match)
      );
    });
    if (hasComplexParams) {
      return true;
    }
  }

  return false;
}

/**
 * TIER 2: Enhanced Compatibility - Can be parsed and simplified
 */
export function isEnhancedCompatible(storedFilter: any): boolean {
  // Exclude high-fidelity cases from simple conversion
  if (requiresHighFidelity(storedFilter)) {
    return false;
  }

  // Check for simplifiable query structures
  if (storedFilter.query?.match) {
    return true;
  }

  if (storedFilter.query?.term) {
    return true;
  }

  if (storedFilter.query?.terms) {
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
