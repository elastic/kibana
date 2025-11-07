/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting stored filters to AsCodeFilter format
 *
 * CONVERSION STRATEGIES:
 * 1. Direct Compatibility: Uses simple condition format (primary path for simple operators)
 * 2. Full Compatibility: Direct conversion to AsCodeConditionFilter (simple operators)
 * 3. Enhanced Compatibility: Parse complex query structures into AsCodeConditionFilter
 * 4. Group Handling: Convert combined/bool filters into AsCodeGroupFilter
 * 5. Preserve Original: When conversion would lose data or semantics, preserve as DSL (AsCodeDSLFilter)
 *
 * See: fromStoredFilter() for the main entry point
 */

import type {
  AsCodeFilter,
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
} from '@kbn/es-query-server';
import { SIMPLE_FILTER_OPERATOR } from '@kbn/es-query-constants';
import type { StoredFilter } from './types';
import { migrateFilter } from '../es_query/migrate_filter';
import { FilterConversionError } from './errors';
import { extractBaseProperties } from './utils';
import {
  isFullyCompatible,
  isEnhancedCompatible,
  isStoredGroupFilter,
  requiresHighFidelity,
  isPhraseFilterWithQuery,
  isLegacyFilter,
} from './type_guards';

/**
 * Type definitions for Elasticsearch query structures
 * These represent the dynamic query objects stored in Filter.query
 */
interface RangeQuery {
  [field: string]: {
    gte?: string | number;
    lte?: string | number;
    gt?: string | number;
    lt?: string | number;
  };
}

interface MatchPhraseQuery {
  [field: string]: string | { query: string };
}

interface MatchQuery {
  [field: string]: string | { query: string; type?: string };
}

interface TermQuery {
  [field: string]: string | number | boolean;
}

interface TermsQuery {
  [field: string]: Array<string | number | boolean>;
}

interface ExistsQuery {
  field: string;
}

interface BoolQuery {
  must?: unknown[];
  should?: unknown[];
  must_not?: unknown[];
}

/**
 * Union type for all query structures we handle
 */
interface FilterQuery {
  range?: RangeQuery;
  match_phrase?: MatchPhraseQuery;
  match?: MatchQuery;
  term?: TermQuery;
  terms?: TermsQuery;
  exists?: ExistsQuery;
  bool?: BoolQuery;
}

/**
 * Validate that an array contains values of a single type (homogeneous)
 * @throws FilterConversionError if array contains mixed types
 */
function validateHomogeneousArray(values: Array<string | number | boolean>, context: string): void {
  if (values.length > 0) {
    const firstType = typeof values[0];
    const isHomogeneous = values.every((v) => typeof v === firstType);

    if (!isHomogeneous) {
      throw new FilterConversionError(
        `${context} must have homogeneous value types, got mixed types: ${values
          .map((v) => typeof v)
          .join(', ')}`
      );
    }
  }
}

/**
 * Convert stored Filter (from saved objects/URL state) to AsCodeFilter
 *
 * This function handles the conversion from legacy Filter format to the modern As Code API.
 * Validates and transforms the input into a known good AsCodeFilter format.
 *
 * @param storedFilter The filter to convert (typically from saved object or URL state)
 * @returns AsCodeFilter with condition, group, or dsl format
 * @throws FilterConversionError if filter is null/undefined or critically malformed
 */
export function fromStoredFilter(storedFilter: unknown): AsCodeFilter {
  try {
    // Handle null/undefined input
    if (!storedFilter) {
      throw new FilterConversionError('Cannot convert null or undefined filter');
    }

    // Cast to StoredFilter for type-safe access (we validate shape through type guards below)
    const filter = storedFilter as StoredFilter;

    // Migrate legacy filter formats to modern format only if needed
    // This avoids unnecessary processing for modern filters, which would lose properties
    // via migrateFilter's pick() call. Legacy filters have top-level query properties
    // (range, exists, match_all, match) that need to be moved under .query
    const normalizedFilter = isLegacyFilter(filter) ? migrateFilter(filter) : filter;

    // Extract base properties from stored filter
    const baseProperties = extractBaseProperties(normalizedFilter);

    // STRATEGY 1: Full Compatibility - Direct AsCodeFilter conversion
    if (isFullyCompatible(normalizedFilter)) {
      try {
        const condition = convertToSimpleCondition(normalizedFilter);
        return {
          ...baseProperties,
          condition,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to enhanced handling
      }
    }

    // STRATEGY 2: Enhanced Compatibility - Parse and simplify when possible
    // This includes phrase filters with match_phrase queries
    if (isEnhancedCompatible(normalizedFilter) || isPhraseFilterWithQuery(normalizedFilter)) {
      try {
        const condition = convertWithEnhancement(normalizedFilter);
        return {
          ...baseProperties,
          condition,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // STRATEGY 3: High-Fidelity Check - Preserve as DSL only for truly complex cases
    if (requiresHighFidelity(normalizedFilter)) {
      return {
        ...baseProperties,
        dsl: convertToRawDSLWithReason(normalizedFilter),
      };
    }

    // STRATEGY 4: Handle grouped filters
    if (isStoredGroupFilter(normalizedFilter)) {
      try {
        const group = convertToFilterGroup(normalizedFilter);
        return {
          ...baseProperties,
          group,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // STRATEGY 5: Preserve Original - No data loss, keep as RawDSL
    return {
      ...baseProperties,
      dsl: convertToRawDSLWithReason(normalizedFilter),
    };
  } catch (error) {
    if (error instanceof FilterConversionError) {
      throw error;
    }
    throw new FilterConversionError(
      `Failed to convert stored filter: ${error instanceof Error ? error.message : String(error)}`,
      storedFilter
    );
  }
}

/**
 * Convert stored filter to simple condition (Strategy 1 & 2)
 */
export function convertToSimpleCondition(
  storedFilter: StoredFilter
): AsCodeConditionFilter['condition'] {
  const meta = storedFilter.meta || {};
  const query = (storedFilter.query || {}) as FilterQuery;

  // Extract field name - ExtendedFilter type includes optional 'field' property
  const field = meta.key || meta.field || extractFieldFromQuery(query);
  if (!field) {
    throw new FilterConversionError('Cannot determine field name from stored filter');
  }

  // Determine operator and value based on query structure
  if (query.exists) {
    return {
      field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.NOT_EXISTS : SIMPLE_FILTER_OPERATOR.EXISTS,
    };
  }

  if (query.range) {
    const rangeQuery = query.range[field];
    const rangeValue: {
      gte?: number | string;
      lte?: number | string;
      gt?: number | string;
      lt?: number | string;
    } = {};

    if (rangeQuery?.gte !== undefined) rangeValue.gte = rangeQuery.gte;
    if (rangeQuery?.lte !== undefined) rangeValue.lte = rangeQuery.lte;
    if (rangeQuery?.gt !== undefined) rangeValue.gt = rangeQuery.gt;
    if (rangeQuery?.lt !== undefined) rangeValue.lt = rangeQuery.lt;

    return {
      field,
      operator: SIMPLE_FILTER_OPERATOR.RANGE,
      value: rangeValue,
    };
  }

  if (query.terms) {
    const values = query.terms[field];
    const valueArray = Array.isArray(values) ? values : [values];

    // Validate that all values are the same type (homogeneous array)
    validateHomogeneousArray(valueArray, 'Terms query');

    return {
      field,
      operator: meta.negate
        ? SIMPLE_FILTER_OPERATOR.IS_NOT_ONE_OF
        : SIMPLE_FILTER_OPERATOR.IS_ONE_OF,
      value: valueArray as string[] | number[] | boolean[],
    };
  }

  if (query.term) {
    const value = query.term[field];
    return {
      field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value,
    };
  }

  if (query.match) {
    const matchField = Object.keys(query.match)[0];
    const matchValue = query.match[matchField];
    const value = typeof matchValue === 'object' ? matchValue.query : matchValue;

    return {
      field: matchField, // Use the field from the query, not meta
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value,
    };
  }

  if (query.match_phrase) {
    const phraseField = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[phraseField];
    return {
      field: phraseField, // Use the field from the query, not meta
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Fallback - try to extract from meta.params
  // Note: params can be various types; checking for object with query property
  const params = meta.params as { query?: unknown } | undefined;
  if (params && typeof params === 'object' && 'query' in params && params.query !== undefined) {
    return {
      field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value: params.query as string | number | boolean,
    };
  }

  throw new FilterConversionError(`Unsupported query structure: ${JSON.stringify(query)}`);
}

/**
 * Convert stored filter to filter group
 */
export function convertToFilterGroup(storedFilter: StoredFilter): AsCodeGroupFilter['group'] {
  // Handle combined filter format (legacy): meta.type === 'combined' with params array
  if (storedFilter.meta?.type === 'combined' && Array.isArray(storedFilter.meta.params)) {
    // ExtendedFilter type includes optional 'relation' property
    const type = storedFilter.meta.relation === 'or' ? 'or' : 'and';

    // Type guard: params should be StoredFilter[] for combined filters
    const params = storedFilter.meta.params;
    if (!Array.isArray(params) || params.some((p) => typeof p === 'string')) {
      throw new FilterConversionError('Combined filter params must be StoredFilter array');
    }

    const conditions = (params as StoredFilter[]).map((param) => {
      // Each param is itself a complete stored filter
      // Recursively convert it to get the condition
      const paramFilter = fromStoredFilter(param);

      // Extract just the condition from the converted filter
      if ('condition' in paramFilter && paramFilter.condition) {
        return paramFilter.condition;
      }
      if ('group' in paramFilter && paramFilter.group) {
        return paramFilter.group;
      }
      // If it's a DSL filter, we can't convert it to a condition
      throw new FilterConversionError('Cannot convert combined filter param to condition');
    });

    return {
      type,
      conditions: conditions as AsCodeGroupFilter['group']['conditions'],
    };
  }

  // Handle bool query format (modern)
  const query = storedFilter.query?.bool;
  if (!query) {
    throw new FilterConversionError('Expected bool query or combined meta for group filter');
  }

  const type = query.must ? 'and' : 'or';
  const clausesRaw = query.must || query.should || [];
  const clauses = Array.isArray(clausesRaw) ? clausesRaw : [clausesRaw];

  const conditions = clauses.map((clause: unknown) => {
    // Create a mock stored filter for each clause to convert recursively
    const mockStored: StoredFilter = {
      meta: storedFilter.meta,
      query: clause as Record<string, unknown>,
    };

    // This is a simplified conversion - in practice, you'd need more sophisticated logic
    return convertToSimpleCondition(mockStored);
  });

  return {
    type,
    conditions,
  };
}

/**
 * STRATEGY 2: Convert with enhancement - parse complex structures when possible
 */
export function convertWithEnhancement(
  storedFilter: StoredFilter
): AsCodeConditionFilter['condition'] {
  // Handle query-based filters (legacy filters already migrated to query format)
  if (storedFilter.query) {
    return parseQueryFilter(storedFilter);
  }

  throw new FilterConversionError('Filter is not enhancement-compatible');
}

/**
 * Parse query-based filters (match_phrase, range, exists, etc.)
 */
export function parseQueryFilter(storedFilter: StoredFilter): AsCodeConditionFilter['condition'] {
  const query = storedFilter.query as FilterQuery | undefined;
  if (!query) {
    throw new FilterConversionError('Filter query is undefined');
  }
  const meta = storedFilter.meta || {};

  // Handle match_phrase queries
  if (query.match_phrase) {
    const field = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[field];

    return {
      field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Handle match queries with phrase type
  if (query.match) {
    const field = Object.keys(query.match)[0];
    const config = query.match[field];

    // Check if this is a phrase-type match query
    if (typeof config === 'object' && (config.type === 'phrase' || config.query)) {
      return {
        field,
        operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
        value: config.query || String(config),
      };
    }
  }

  // Handle range queries
  if (query.range) {
    const field = Object.keys(query.range)[0];
    const rangeConfig = query.range[field];

    return {
      field,
      operator: SIMPLE_FILTER_OPERATOR.RANGE,
      value: rangeConfig,
    };
  }

  // Handle term queries
  if (query.term) {
    const field = Object.keys(query.term)[0];
    const value = query.term[field];

    return {
      field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.IS_NOT : SIMPLE_FILTER_OPERATOR.IS,
      value,
    };
  }

  // Handle terms queries (multiple values)
  if (query.terms) {
    const field = Object.keys(query.terms)[0];
    const values = query.terms[field];

    // Validate that all values are the same type (homogeneous array)
    validateHomogeneousArray(values, 'Terms query');

    return {
      field,
      operator: meta.negate
        ? SIMPLE_FILTER_OPERATOR.IS_NOT_ONE_OF
        : SIMPLE_FILTER_OPERATOR.IS_ONE_OF,
      value: values as string[] | number[] | boolean[],
    };
  }

  // Handle exists queries
  if (query.exists) {
    return {
      field: query.exists.field,
      operator: meta.negate ? SIMPLE_FILTER_OPERATOR.NOT_EXISTS : SIMPLE_FILTER_OPERATOR.EXISTS,
    };
  }

  throw new FilterConversionError('Query type not supported for enhancement');
}

/**
 * STRATEGY 3: Convert to RawDSL with preservation reason
 */
export function convertToRawDSLWithReason(storedFilter: StoredFilter): AsCodeDSLFilter['dsl'] {
  // Preserved as RawDSL for maximum compatibility
  return {
    query: storedFilter.query || storedFilter,
  };
}

/**
 * Extract field name from query object (for filters without meta.key)
 */
export function extractFieldFromQuery(query: unknown): string | null {
  if (!query || typeof query !== 'object') return null;

  const q = query as FilterQuery;

  if (q.term) {
    return Object.keys(q.term)[0] || null;
  }
  if (q.terms) {
    return Object.keys(q.terms)[0] || null;
  }
  if (q.range) {
    return Object.keys(q.range)[0] || null;
  }
  if (q.exists) {
    return q.exists.field || null;
  }
  if (q.match) {
    return Object.keys(q.match)[0] || null;
  }
  if (q.match_phrase) {
    return Object.keys(q.match_phrase)[0] || null;
  }
  return null;
}
