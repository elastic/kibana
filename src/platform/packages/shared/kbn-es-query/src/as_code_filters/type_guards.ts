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
import { FILTERS } from '../filters';

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
 * Type guard for phrases filter format
 */
export function isPhrasesFilter(storedFilter: StoredFilter): boolean {
  return storedFilter.meta?.type === FILTERS.PHRASES;
}

/**
 * Type guard for combined filter format
 * Validates that params is a non-empty array of Filter objects (not primitives)
 */
export function isCombinedFilter(storedFilter: StoredFilter): boolean {
  return (
    storedFilter.meta?.type === 'combined' &&
    Array.isArray(storedFilter.meta.params) &&
    storedFilter.meta.params.length > 0 &&
    !storedFilter.meta.params.some((p) => typeof p !== 'object' || p === null)
  );
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
 * Type guard to check if a condition filter has a range operator
 * Range filters are the only condition filters that can have a negate property
 */
export function isRangeConditionFilter(
  filter: AsCodeFilter
): filter is AsCodeConditionFilter & { condition: { operator: 'range' }; negate?: boolean } {
  return (
    isConditionFilter(filter) && 'condition' in filter && filter.condition.operator === 'range'
  );
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
