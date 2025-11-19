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

/**
 * Type guard for query objects with term property
 */
export function hasTermQuery(query: unknown): query is { term: Record<string, unknown> } {
  return typeof query === 'object' && query !== null && 'term' in query;
}

/**
 * Type guard for query objects with terms property
 */
export function hasTermsQuery(query: unknown): query is { terms: Record<string, unknown> } {
  return typeof query === 'object' && query !== null && 'terms' in query;
}

/**
 * Type guard for query objects with range property
 */
export function hasRangeQuery(query: unknown): query is { range: Record<string, unknown> } {
  return typeof query === 'object' && query !== null && 'range' in query;
}

/**
 * Type guard for query objects with exists property
 */
export function hasExistsQuery(query: unknown): query is { exists: { field: string } } {
  return typeof query === 'object' && query !== null && 'exists' in query;
}

/**
 * Type guard for query objects with match property
 */
export function hasMatchQuery(query: unknown): query is { match: Record<string, unknown> } {
  return typeof query === 'object' && query !== null && 'match' in query;
}

/**
 * Type guard for query objects with match_phrase property
 */
export function hasMatchPhraseQuery(
  query: unknown
): query is { match_phrase: Record<string, unknown> } {
  return typeof query === 'object' && query !== null && 'match_phrase' in query;
}

/**
 * Type guard to check if a filter condition is an AsCodeConditionFilter['condition']
 * with field and operator properties
 */
export function isAsCodeConditionFilter(
  condition: unknown
): condition is AsCodeConditionFilter['condition'] {
  return (
    typeof condition === 'object' &&
    condition !== null &&
    'field' in condition &&
    'operator' in condition
  );
}

/**
 * Type guard for query objects with bool.should structure
 */
export function isPhrasesFilter(storedFilter: StoredFilter): boolean {
  const query = storedFilter.query;
  return (
    storedFilter.meta?.type === 'phrases' &&
    typeof query === 'object' &&
    query !== null &&
    'bool' in query &&
    typeof (query as { bool?: unknown }).bool === 'object' &&
    (query as { bool?: { should?: unknown } }).bool !== null &&
    'should' in (query as { bool: { should?: unknown } }).bool &&
    Array.isArray((query as { bool: { should: unknown[] } }).bool.should)
  );
}

/**
 * Type guard for combined filter format
 */
export function isCombinedFilter(storedFilter: StoredFilter): boolean {
  return (
    storedFilter.meta?.type === 'combined' &&
    Array.isArray(storedFilter.meta.params) &&
    storedFilter.meta.params.length > 0
  );
}

/**
 * TIER 1: Full Compatibility - Can be directly converted to SimpleFilter
 */
export function isFullyCompatible(storedFilter: StoredFilter): boolean {
  // Combined filter format
  if (isCombinedFilter(storedFilter)) {
    return true;
  }

  const meta = storedFilter.meta || {};

  // Phrases filter
  if (meta.type === 'phrases' && meta.params && Array.isArray(meta.params)) {
    return true;
  }

  // Simple phrase filter
  if (meta.type === 'phrase' && meta.params) {
    return true;
  }

  // Simple exists filter
  if (meta.type === 'exists') {
    return true;
  }

  // Simple range filter
  if (meta.type === 'range' && meta.params) {
    return true;
  }

  return false;
}

/**
 * Check if this is a phrase filter that can be converted to a simple condition
 */
export function isPhraseFilterWithQuery(storedFilter: StoredFilter): boolean {
  // match_phrase queries that can be simplified to phrase conditions
  if (storedFilter.query?.match_phrase) {
    return true;
  }

  // meta.type indicates this should be treated as phrase filter
  if (storedFilter.meta?.type === 'phrase' && storedFilter.query) {
    return true;
  }

  // match queries with phrase type that can be simplified
  if (!storedFilter.query?.match) {
    return false;
  }

  const matchValues = Object.values(storedFilter.query.match);
  return matchValues.some((value: unknown) => {
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
}

/**
 * TIER 2: Enhanced Compatibility - Can be parsed and simplified
 */
export function isEnhancedCompatible(storedFilter: StoredFilter): boolean {
  // Query-based filters that can be parsed into conditions
  // Simple checks first for performance (most common cases)
  if (
    hasTermQuery(storedFilter.query) ||
    hasTermsQuery(storedFilter.query) ||
    hasRangeQuery(storedFilter.query) ||
    hasExistsQuery(storedFilter.query) ||
    isPhraseFilterWithQuery(storedFilter)
  ) {
    return true;
  }

  // Legacy filters (without query wrapper)
  const legacyFilter = storedFilter as { range?: unknown; exists?: unknown; query?: unknown };

  // Legacy range format
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
export function isStoredGroupFilter(storedFilter: StoredFilter): boolean {
  // Combined filter format (legacy): meta.type === 'combined' with params array
  if (isCombinedFilter(storedFilter)) {
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
// TYPE GUARDS FOR AS CODE FILTERS
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
