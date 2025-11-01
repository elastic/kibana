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
  Filter,
} from '@kbn/es-query-server';

/**
 * Legacy filter interface for legacy Kibana filter format
 * These filters have query properties at the top level instead of under .query
 */
interface LegacyFilter {
  meta?: unknown;
  $state?: unknown;
  range?: unknown;
  exists?: unknown;
  match_all?: unknown;
  match?: unknown;
}

/**
 * Type guard to check if a filter has legacy Kibana filter format properties
 * These filters have query properties at the top level instead of under .query
 */
export function isLegacyFilter(value: unknown): value is LegacyFilter {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const filter = value as Record<string, unknown>;

  // Check for legacy top-level properties (legacy Kibana filter format)
  return !!(filter.range || filter.exists || filter.match_all || filter.match);
}

// ====================================================================
// TIER DETECTION FUNCTIONS
// ====================================================================

/**
 * TIER 1: Full Compatibility - Can be directly converted to SimplifiedFilter
 */
export function isFullyCompatible(storedFilter: unknown): boolean {
  const filter = storedFilter as Filter;
  const meta = filter.meta || {};

  // Simple phrase filter without complex query structure
  if (meta.type === 'phrase' && !filter.query && meta.params) {
    return true;
  }

  // Simple exists filter
  if (meta.type === 'exists' && !filter.query) {
    return true;
  }

  // Simple range filter without complex query structure
  if (meta.type === 'range' && !filter.query && meta.params) {
    return true;
  }

  return false;
}

/**
 * Check if this is a phrase filter that can be converted to a simple condition
 */
export function isPhraseFilterWithQuery(storedFilter: unknown): boolean {
  const filter = storedFilter as Filter;
  // match_phrase queries that can be simplified to phrase conditions
  if (filter.query?.match_phrase) {
    return true;
  }

  // match queries with phrase type that can be simplified
  if (filter.query?.match) {
    const matchValues = Object.values(filter.query.match);
    const isSimplePhrase = matchValues.some((value: unknown) => {
      // Type guard for match query value
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      const v = value as {
        type?: string;
        analyzer?: unknown;
        fuzziness?: unknown;
        minimum_should_match?: unknown;
      };
      return v.type === 'phrase' && !v.analyzer && !v.fuzziness && !v.minimum_should_match;
    });
    if (isSimplePhrase) {
      return true;
    }
  }

  // meta.type indicates this should be treated as phrase filter
  if (filter.meta?.type === 'phrase' && filter.query) {
    return true;
  }

  return false;
}

/**
 * TIER 1.5: High-Fidelity Detection - Requires DSL preservation
 * Updated to exclude simple phrase filters
 */
export function requiresHighFidelity(storedFilter: unknown): boolean {
  // Simple phrase filters should be converted, not preserved
  if (isPhraseFilterWithQuery(storedFilter)) {
    return false;
  }

  const filter = storedFilter as Filter;
  // Complex match queries with advanced parameters still need DSL preservation
  if (filter.query?.match) {
    const matchValues = Object.values(filter.query.match);
    const hasComplexParams = matchValues.some((value: unknown) => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      const v = value as {
        analyzer?: unknown;
        fuzziness?: unknown;
        minimum_should_match?: unknown;
      };
      return v.analyzer || v.fuzziness || v.minimum_should_match;
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
export function isEnhancedCompatible(storedFilter: unknown): boolean {
  const filter = storedFilter as Filter;
  // Exclude high-fidelity cases from simple conversion
  if (requiresHighFidelity(storedFilter)) {
    return false;
  }

  // Try to convert phrase filters with queries
  if (isPhraseFilterWithQuery(storedFilter)) {
    return true;
  }

  // Match queries can be parsed into phrase/range conditions
  if (filter.query?.match) {
    const matchValues = Object.values(filter.query.match);
    return matchValues.some((value) => typeof value === 'string' || typeof value === 'number');
  }

  // Term queries
  if (filter.query?.term) {
    return true;
  }

  // Terms queries (multi-value conditions)
  if (filter.query?.terms) {
    return true;
  }

  // Range queries
  if (filter.query?.range) {
    return true;
  }

  // Exists queries
  if (filter.query?.exists) {
    return true;
  }

  // Legacy range format (without query wrapper)
  // Need to cast to access legacy properties not in Filter type
  const legacyFilter = filter as { range?: unknown; exists?: unknown; query?: unknown };
  if (legacyFilter.range && !legacyFilter.query) {
    return true;
  }

  // Legacy exists format
  if (legacyFilter.exists && !legacyFilter.query) {
    return true;
  }

  return false;
}

/**
 * Detect if this represents a grouped filter with multiple conditions
 */
export function isStoredGroupFilter(storedFilter: unknown): boolean {
  const filter = storedFilter as Filter;
  // Combined filter format (legacy): meta.type === 'combined' with params array
  if (
    filter.meta?.type === 'combined' &&
    Array.isArray(filter.meta.params) &&
    (filter.meta.params as unknown[]).length > 0
  ) {
    return true;
  }

  // Nested bool query with multiple conditions
  // Cast query to access nested bool structure
  const boolQuery = filter.query?.bool as { must?: unknown[]; should?: unknown[] } | undefined;
  if (boolQuery && ((boolQuery.must?.length ?? 0) > 1 || (boolQuery.should?.length ?? 0) > 1)) {
    return true;
  }

  return false;
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
): condition is SimpleFilterCondition & { value: unknown } {
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
  const c = condition as { conditions?: unknown };
  return 'conditions' in condition && Array.isArray(c.conditions);
}
