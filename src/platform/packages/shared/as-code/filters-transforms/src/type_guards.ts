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
  AsCodeSpatialFilter,
} from '@kbn/as-code-filters-schema';
import { ASCODE_FILTER_TYPE } from '@kbn/as-code-filters-constants';
import { FILTERS } from '@kbn/es-query';
import type { StoredFilter } from './types';

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
  return filter.type === ASCODE_FILTER_TYPE.CONDITION;
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
  return filter.type === ASCODE_FILTER_TYPE.GROUP;
}

/**
 * Type guard to check if filter has a dsl property
 */
export function isDSLFilter(filter: AsCodeFilter): filter is AsCodeDSLFilter {
  return filter.type === ASCODE_FILTER_TYPE.DSL;
}

/**
 * Type guard to check if filter is a spatial filter
 */
export function isSpatialFilter(filter: AsCodeFilter): filter is AsCodeSpatialFilter {
  return filter.type === ASCODE_FILTER_TYPE.SPATIAL;
}

/**
 * Type guard to check if condition is a group of conditions
 */
export function isGroupCondition(
  condition: AsCodeConditionFilter['condition'] | AsCodeGroupFilter['group']
): condition is AsCodeGroupFilter['group'] {
  const c = condition as { conditions?: unknown };
  return 'conditions' in condition && Array.isArray(c.conditions);
}

/**
 * Type guard to check if an AsCodeFilter has valid structure
 * Validates that exactly one of condition, group, dsl, or spatial is present
 */
export function isAsCodeFilter(filter: AsCodeFilter): boolean {
  const hasCondition = isConditionFilter(filter);
  const hasGroup = isGroupFilter(filter);
  const hasDSL = isDSLFilter(filter);
  const hasSpatial = isSpatialFilter(filter);

  // Exactly one of the four must be true
  const count = [hasCondition, hasGroup, hasDSL, hasSpatial].filter(Boolean).length;
  return count === 1;
}
