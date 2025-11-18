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
 * CONVERSION STRATEGIES (in order of evaluation):
 * 1. Simple Conditions: Filters with complete metadata (isFullyCompatible) - uses meta.key, meta.params
 * 2. Query Parsing: Filters with parseable query DSL (isEnhancedCompatible) - extracts from query structure
 * 3. Filter Groups: Combined/bool filters with multiple conditions - recursively converts nested filters
 * 4. Fallback DSL: Any remaining filters preserved as raw DSL to prevent data loss
 *
 * See: fromStoredFilter() for the main entry point
 */

import type {
  AsCodeFilter,
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
} from '@kbn/es-query-server';
import { ASCODE_FILTER_OPERATOR } from '@kbn/es-query-constants';
import type { StoredFilter } from './types';
import { migrateFilter } from '../es_query/migrate_filter';
import { FilterConversionError } from './errors';
import { extractBaseProperties } from './utils';
import {
  isFullyCompatible,
  isEnhancedCompatible,
  isStoredGroupFilter,
  isLegacyFilter,
  hasTermQuery,
  hasTermsQuery,
  hasRangeQuery,
  hasExistsQuery,
  hasMatchQuery,
  hasMatchPhraseQuery,
} from './type_guards';

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
    // Note: migrateFilter returns Filter type, but since we're migrating from StoredFilter,
    // the result maintains the StoredFilter schema shape (includes meta.field, meta.params, etc.)
    const normalizedFilter = (
      isLegacyFilter(filter) ? migrateFilter(filter) : filter
    ) as StoredFilter;

    // Extract base properties from stored filter
    const baseProperties = extractBaseProperties(normalizedFilter);

    // STRATEGY 1: Simple Conditions - Filters with metadata-only representation
    if (isFullyCompatible(normalizedFilter)) {
      try {
        const condition = convertToSimpleCondition(normalizedFilter);
        return {
          ...baseProperties,
          condition,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to next strategy
      }
    }

    // STRATEGY 2: Query Parsing - Extract conditions from query DSL structure
    // Handles filters where metadata is incomplete but query structure is parseable
    // (match_phrase, match, term, terms, range, exists queries)
    if (isEnhancedCompatible(normalizedFilter)) {
      try {
        const condition = convertWithEnhancement(normalizedFilter);
        return {
          ...baseProperties,
          condition,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to next strategy
      }
    }

    // STRATEGY 3: Filter Groups - Convert combined/bool filters to group format
    if (isStoredGroupFilter(normalizedFilter)) {
      try {
        const group = convertToFilterGroup(normalizedFilter);
        return {
          ...baseProperties,
          group,
        };
      } catch (conversionError) {
        // If conversion fails, fall through to next strategy (DSL preservation)
      }
    }

    // STRATEGY 4: Fallback DSL - Preserve any remaining filters to prevent data loss
    const meta = normalizedFilter.meta;
    return {
      ...baseProperties,
      dsl: convertToRawDSL(normalizedFilter),
      // Add field and params ONLY for DSL filters (not available in condition.field)
      ...(meta?.field ? { field: meta.field } : {}),
      ...(meta?.params ? { params: meta.params } : {}),
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
 * Convert stored filter to simple condition (Strategy 1)
 * Extracts field, operator, and value from filter metadata and query structures
 * Used by both Strategy 1 (direct conversion) and Strategy 3 (group conversion helper)
 */
export function convertToSimpleCondition(
  storedFilter: StoredFilter
): AsCodeConditionFilter['condition'] {
  const meta = storedFilter.meta || {};
  const query = storedFilter.query || {};

  // Extract field name - ExtendedFilter type includes optional 'field' property
  const field = meta.key || meta.field || extractFieldFromQuery(query);
  if (!field) {
    throw new FilterConversionError('Cannot determine field name from stored filter');
  }

  // Determine operator and value based on query structure
  if (hasExistsQuery(query)) {
    return {
      field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.NOT_EXISTS : ASCODE_FILTER_OPERATOR.EXISTS,
    };
  }

  if (hasRangeQuery(query)) {
    const rangeQuery = query.range[field] as unknown;
    const rangeValue: {
      gte?: number | string;
      lte?: number | string;
      gt?: number | string;
      lt?: number | string;
    } = {};

    if (typeof rangeQuery === 'object' && rangeQuery !== null) {
      const range = rangeQuery as Record<string, unknown>;
      if (range.gte !== undefined) rangeValue.gte = range.gte as number | string;
      if (range.lte !== undefined) rangeValue.lte = range.lte as number | string;
      if (range.gt !== undefined) rangeValue.gt = range.gt as number | string;
      if (range.lt !== undefined) rangeValue.lt = range.lt as number | string;
    }

    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.RANGE,
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
        ? ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF
        : ASCODE_FILTER_OPERATOR.IS_ONE_OF,
      value: valueArray as string[] | number[] | boolean[],
    };
  }

  if (query.term) {
    const value = query.term[field];
    return {
      field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value,
    };
  }

  if (query.match) {
    const matchField = Object.keys(query.match)[0];
    const matchValue = query.match[matchField];
    const value = typeof matchValue === 'object' ? matchValue.query : matchValue;

    return {
      field: matchField, // Use the field from the query, not meta
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value,
    };
  }

  if (query.match_phrase) {
    const phraseField = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[phraseField];
    return {
      field: phraseField, // Use the field from the query, not meta
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Fallback - try to extract from meta.params
  // Note: params can be various types; checking for object with query property
  const params = meta.params as { query?: unknown } | undefined;
  if (params && typeof params === 'object' && 'query' in params && params.query !== undefined) {
    return {
      field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value: params.query as string | number | boolean,
    };
  }

  throw new FilterConversionError(`Unsupported query structure: ${JSON.stringify(query)}`);
}

/**
 * Convert stored filter to filter group (Strategy 3)
 * Handles combined filters (legacy meta.type='combined') and bool queries (modern)
 * Recursively converts nested filters to preserve group structure
 */
export function convertToFilterGroup(storedFilter: StoredFilter): AsCodeGroupFilter['group'] {
  // Handle combined filter format (legacy): meta.type === 'combined' with params array
  if (storedFilter.meta?.type === 'combined' && Array.isArray(storedFilter.meta.params)) {
    // ExtendedFilter type includes optional 'relation' property
    // Note: relation can be 'or'/'OR' or 'and'/'AND' - normalize to lowercase
    const type = storedFilter.meta.relation?.toString().toLowerCase() === 'or' ? 'or' : 'and';

    // Type guard: params should be StoredFilter[] for combined filters
    const params = storedFilter.meta.params;
    if (!Array.isArray(params) || params.some((p) => typeof p === 'string')) {
      throw new FilterConversionError('Combined filter params must be StoredFilter array');
    }

    const conditions = (params as StoredFilter[]).map((param) => {
      // Special handling for phrases filters with bool wrappers - treat as groups
      // This preserves the bool structure which is semantically important even for single values
      if (
        param.meta?.type === 'phrases' &&
        param.query?.bool &&
        (param.query.bool.should || param.query.bool.must)
      ) {
        // Recursively convert the phrases filter to a group
        return convertToFilterGroup(param);
      }

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
    // Create a temporary stored filter for each clause to convert recursively
    // For phrases filters, each clause is a simple match_phrase - don't pass phrases meta
    const simplifiedMeta =
      storedFilter.meta?.type === 'phrases'
        ? {
            // Extract just the field info, drop the phrases-specific metadata
            key: storedFilter.meta.key,
            field: storedFilter.meta.field,
            negate: storedFilter.meta.negate,
            disabled: storedFilter.meta.disabled,
            index: storedFilter.meta.index,
          }
        : storedFilter.meta;

    const clauseFilter: StoredFilter = {
      meta: simplifiedMeta,
      query: clause as Record<string, unknown>,
    };

    return convertToSimpleCondition(clauseFilter);
  });

  return {
    type,
    conditions,
  };
}

/**
 * Strategy 2: Query Parsing - Parse Elasticsearch DSL into conditions
 * Handles query-based filters by extracting field/operator/value from query structure
 * Supports: match_phrase, match, range, term, terms, exists queries
 */
export function convertWithEnhancement(
  storedFilter: StoredFilter
): AsCodeConditionFilter['condition'] {
  const query = storedFilter.query;
  if (!query) {
    throw new FilterConversionError('Filter query is undefined');
  }
  const meta = storedFilter.meta || {};

  // Handle match_phrase queries
  if (hasMatchPhraseQuery(query)) {
    const field = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[field] as unknown;

    return {
      field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value: (typeof value === 'object' && value !== null
        ? (value as { query: string }).query
        : value) as string | number | boolean,
    };
  }

  // Handle match queries with phrase type
  if (hasMatchQuery(query)) {
    const field = Object.keys(query.match)[0];
    const config = query.match[field] as unknown;

    // Check if this is a phrase-type match query
    if (typeof config === 'object' && config !== null) {
      const matchConfig = config as Record<string, unknown>;
      if (matchConfig.type === 'phrase' || matchConfig.query !== undefined) {
        return {
          field,
          operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
          value: (matchConfig.query as string | number | boolean) || String(config),
        };
      }
    }
  }

  // Handle range queries
  if (hasRangeQuery(query)) {
    const field = Object.keys(query.range)[0];
    const rangeConfig = query.range[field] as unknown;

    return {
      field,
      operator: ASCODE_FILTER_OPERATOR.RANGE,
      value: rangeConfig as Record<string, number | string>,
    };
  }

  // Handle term queries
  if (hasTermQuery(query)) {
    const field = Object.keys(query.term)[0];
    const value = query.term[field] as unknown;

    return {
      field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.IS_NOT : ASCODE_FILTER_OPERATOR.IS,
      value: value as string | number | boolean,
    };
  }

  // Handle terms queries (multiple values)
  if (hasTermsQuery(query)) {
    const field = Object.keys(query.terms)[0];
    const values = query.terms[field] as unknown;

    // Validate that all values are the same type (homogeneous array)
    const valueArray = values as string[] | number[] | boolean[];
    validateHomogeneousArray(valueArray, 'Terms query');

    return {
      field,
      operator: meta.negate
        ? ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF
        : ASCODE_FILTER_OPERATOR.IS_ONE_OF,
      value: valueArray,
    };
  }

  // Handle exists queries
  if (hasExistsQuery(query)) {
    return {
      field: query.exists.field,
      operator: meta.negate ? ASCODE_FILTER_OPERATOR.NOT_EXISTS : ASCODE_FILTER_OPERATOR.EXISTS,
    };
  }

  throw new FilterConversionError('Query type not supported for enhancement');
}

/**
 * Convert stored filter to DSL format (Strategy 4 - Fallback)
 * Used when filter cannot be converted to condition or group format
 * Preserves original query structure to prevent data loss
 */
export function convertToRawDSL(storedFilter: StoredFilter): AsCodeDSLFilter['dsl'] {
  return {
    query: storedFilter.query || storedFilter,
  };
}

/**
 * Extract field name from query object (for filters without meta.key)
 */
export function extractFieldFromQuery(query: unknown): string | null {
  if (!query || typeof query !== 'object') return null;

  if (hasTermQuery(query)) {
    return Object.keys(query.term)[0] || null;
  }
  if (hasTermsQuery(query)) {
    return Object.keys(query.terms)[0] || null;
  }
  if (hasRangeQuery(query)) {
    return Object.keys(query.range)[0] || null;
  }
  if (hasExistsQuery(query)) {
    return query.exists.field || null;
  }
  if (hasMatchQuery(query)) {
    return Object.keys(query.match)[0] || null;
  }
  if (hasMatchPhraseQuery(query)) {
    return Object.keys(query.match_phrase)[0] || null;
  }
  return null;
}
