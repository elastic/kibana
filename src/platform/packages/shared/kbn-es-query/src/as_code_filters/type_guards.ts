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
  AsCodeFilter,
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
} from '@kbn/es-query-server';
import type { StoredFilter } from './types';

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
 * Type guard to check if value has the minimal structure of a StoredFilter
 */
function isStoredFilter(value: unknown): value is StoredFilter {
  return typeof value === 'object' && value !== null;
}

/**
 * TIER 1: Full Compatibility - Can be directly converted to SimpleFilter
 */
export function isFullyCompatible(storedFilter: unknown): boolean {
  if (!isStoredFilter(storedFilter)) {
    return false;
  }

  const meta = storedFilter.meta || {};

  // Simple phrase filter without complex query structure
  if (meta.type === 'phrase' && !storedFilter.query && meta.params) {
    return true;
  }

  // Simple exists filter
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
export function isPhraseFilterWithQuery(storedFilter: unknown): boolean {
  if (!isStoredFilter(storedFilter)) {
    return false;
  }

  // match_phrase queries that can be simplified to phrase conditions
  if (storedFilter.query?.match_phrase) {
    return true;
  }

  // match queries with phrase type that can be simplified
  if (storedFilter.query?.match) {
    const matchValues = Object.values(storedFilter.query.match);
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
  if (storedFilter.meta?.type === 'phrase' && storedFilter.query) {
    return true;
  }

  return false;
}

/**
 * Determine if a stored filter requires high-fidelity preservation (DSL format)
 * Checks for complex query features that can't be simplified
 */
export function requiresHighFidelity(storedFilter: unknown): boolean {
  if (!isStoredFilter(storedFilter)) {
    return false;
  }

  if (!storedFilter.query) {
    return false;
  }

  // Check for multi-match queries
  if (storedFilter.query.multi_match) {
    return true;
  }

  // Check for match queries with complexity
  if (storedFilter.query?.match) {
    const matchValues = Object.values(storedFilter.query.match);
    const hasComplexMatch = matchValues.some((value: unknown) => {
      // Type guard for match query value
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      return Boolean(
        'analyzer' in value || 'fuzziness' in value || 'minimum_should_match' in value
      );
    });
    if (hasComplexMatch) {
      return true;
    }
  }

  // Check for bool queries with multiple clauses
  if (storedFilter.query.bool) {
    const clauseTypes = ['must', 'must_not', 'should', 'filter'] as const;
    const presentClauses = clauseTypes.filter((type) => Boolean(storedFilter.query?.bool[type]));

    // Complex bool with multiple clause types or minimum_should_match
    if (presentClauses.length > 1 || 'minimum_should_match' in storedFilter.query.bool) {
      return true;
    }
  }

  return false;
}

/**
 * TIER 2: Enhanced Compatibility - Can be parsed and simplified
 */
export function isEnhancedCompatible(storedFilter: unknown): boolean {
  if (!isStoredFilter(storedFilter)) {
    return false;
  }

  // Exclude high-fidelity cases from simple conversion
  if (requiresHighFidelity(storedFilter)) {
    return false;
  }

  // Try to convert phrase filters with queries
  if (isPhraseFilterWithQuery(storedFilter)) {
    return true;
  }

  // Match queries can be parsed into phrase/range conditions
  if (storedFilter.query?.match) {
    const matchValues = Object.values(storedFilter.query.match);
    return matchValues.some((value) => typeof value === 'string' || typeof value === 'number');
  }

  // Term queries
  if (storedFilter.query?.term) {
    return true;
  }

  // Terms queries (multi-value conditions)
  if (storedFilter.query?.terms) {
    return true;
  }

  // Range queries
  if (storedFilter.query?.range) {
    return true;
  }

  // Exists queries
  if (storedFilter.query?.exists) {
    return true;
  }

  // Legacy range format (without query wrapper)
  // Check for legacy properties
  const legacyFilter = storedFilter as { range?: unknown; exists?: unknown; query?: unknown };
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
  if (!isStoredFilter(storedFilter)) {
    return false;
  }

  // Combined filter format (legacy): meta.type === 'combined' with params array
  if (
    storedFilter.meta?.type === 'combined' &&
    Array.isArray(storedFilter.meta.params) &&
    storedFilter.meta.params.length > 0
  ) {
    return true;
  }

  // Nested bool query with multiple conditions
  if (
    storedFilter.query?.bool &&
    ((storedFilter.query?.bool.must?.length ?? 0) > 1 ||
      (storedFilter.query?.bool.should?.length ?? 0) > 1)
  ) {
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
export function isConditionFilter(filter: AsCodeFilter): filter is AsCodeConditionFilter {
  return 'condition' in filter && filter.condition !== undefined;
}

/**
 * Type guard to check if filter has a group property
 */
export function isGroupFilter(filter: AsCodeFilter): filter is AsCodeGroupFilter {
  return 'group' in filter && filter.group !== undefined;
}

/**
 * Type guard to check if filter has a dsl property
 */
export function isDSLFilter(filter: AsCodeFilter): filter is AsCodeDSLFilter {
  return 'dsl' in filter && filter.dsl !== undefined;
}

/**
 * Type guard to check if condition requires a value
 */
export function isConditionWithValue(
  condition: AsCodeConditionFilter['condition']
): condition is AsCodeConditionFilter['condition'] & { value: unknown } {
  return !['exists', 'not_exists'].includes(condition.operator);
}

/**
 * Type guard to check if condition is existence-only
 */
export function isExistenceCondition(
  condition: AsCodeConditionFilter['condition']
): condition is AsCodeConditionFilter['condition'] & { operator: 'exists' | 'not_exists' } {
  return ['exists', 'not_exists'].includes(condition.operator);
}

/**
 * Type guard to check if condition is a nested AsCodeGroupFilter
 */
export function isNestedFilterGroup(
  condition: AsCodeConditionFilter['condition'] | AsCodeGroupFilter['group']
): condition is AsCodeGroupFilter['group'] {
  const c = condition as { conditions?: unknown };
  return 'conditions' in condition && Array.isArray(c.conditions);
}

/**
 * Type guard to check if an AsCodeFilter has valid structure
 * Validates that exactly one of condition, group, or dsl is present
 */
export function isAsCodeFilter(filter: AsCodeFilter): boolean {
  const hasCondition = isConditionFilter(filter);
  const hasGroup = isGroupFilter(filter);
  const hasDSL = isDSLFilter(filter);

  // Exactly one of the three must be true
  const count = [hasCondition, hasGroup, hasDSL].filter(Boolean).length;
  return count === 1;
}
