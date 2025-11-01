/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Functions for converting stored filters to SimplifiedFilter format
 *
 * Conversion Strategy (in order of precedence):
 * 1. Legacy Migration: Normalize legacy Kibana filters with top-level query properties
 * 2. Full Compatibility: Direct conversion to SimpleFilterCondition (simple operators)
 * 3. Enhanced Compatibility: Parse complex query structures into SimpleFilterCondition
 * 4. High-Fidelity: Preserve complex filters as RawDSL (custom queries, scripts, etc.)
 * 5. Group Filters: Convert combined/bool queries to FilterGroup
 * 6. Fallback: Preserve as RawDSL to avoid data loss
 *
 * Note on typing: Filter.query is Record<string, any> in the core type definition.
 * We use controlled `any` casts where needed to access dynamic query structures.
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
  RangeValue,
  Filter,
} from '@kbn/es-query-server';
import { migrateFilter } from '../../es_query/migrate_filter';
import { FilterConversionError } from '../errors';
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
 * Convert stored Filter (from saved objects/URL state) to SimplifiedFilter
 *
 * Accepts unknown to handle potentially malformed or legacy filter data from saved objects.
 * Validates and transforms the input into a known good SimplifiedFilter format.
 *
 * @param storedFilter - Filter data from saved objects (may be legacy, modern, or malformed)
 * @returns SimplifiedFilter with condition, group, or dsl format
 * @throws FilterConversionError if filter is null/undefined or critically malformed
 */
export function fromStoredFilter(storedFilter: unknown): SimplifiedFilter {
  try {
    // Handle null/undefined input
    if (!storedFilter) {
      throw new FilterConversionError('Cannot convert null or undefined filter');
    }

    // Cast to Filter for type-safe access (we validate shape through type guards below)
    const filter = storedFilter as Filter;

    // Migrate legacy filter formats to modern format only if needed
    // This avoids unnecessary processing for modern filters, which would lose properties
    // via migrateFilter's pick() call. Legacy filters have top-level query properties
    // (range, exists, match_all, match) that need to be moved under .query
    const normalizedFilter = isLegacyFilter(filter) ? migrateFilter(filter as any) : filter;

    // Extract base properties from stored filter
    const baseProperties = extractBaseProperties(normalizedFilter);

    // STRATEGY 1: Full Compatibility - Direct SimplifiedFilter conversion
    if (isFullyCompatible(normalizedFilter)) {
      try {
        const condition = convertToSimpleCondition(normalizedFilter);
        return {
          ...baseProperties,
          condition,
        } as SimplifiedFilter;
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
        } as SimplifiedFilter;
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // STRATEGY 3: High-Fidelity Check - Preserve as DSL only for truly complex cases
    if (requiresHighFidelity(normalizedFilter)) {
      return {
        ...baseProperties,
        dsl: convertToRawDSLWithReason(normalizedFilter),
      } as SimplifiedFilter;
    }

    // STRATEGY 4: Handle grouped filters
    if (isStoredGroupFilter(normalizedFilter)) {
      try {
        const group = convertToFilterGroup(normalizedFilter);
        return {
          ...baseProperties,
          group,
        } as SimplifiedFilter;
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // STRATEGY 5: Preserve Original - No data loss, keep as RawDSL
    return {
      ...baseProperties,
      dsl: convertToRawDSLWithReason(normalizedFilter),
    } as SimplifiedFilter;
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
export function convertToSimpleCondition(storedFilter: Filter): SimpleFilterCondition {
  const meta = storedFilter.meta || {};
  // Note: Filter.query is Record<string, any> | undefined
  // We cast to any to access specific query properties dynamically
  const query = (storedFilter.query || {}) as any;

  // Extract field name - ExtendedFilter type includes optional 'field' property
  const field = meta.key || meta.field || extractFieldFromQuery(query);
  if (!field) {
    throw new FilterConversionError('Cannot determine field name from stored filter');
  }

  // Determine operator and value based on query structure
  if (query.exists) {
    return {
      field,
      operator: meta.negate ? 'not_exists' : 'exists',
    } as SimpleFilterCondition;
  }

  if (query.range) {
    const rangeQuery = query.range[field];
    const rangeValue: RangeValue = {};

    if (rangeQuery?.gte !== undefined) rangeValue.gte = rangeQuery.gte;
    if (rangeQuery?.lte !== undefined) rangeValue.lte = rangeQuery.lte;
    if (rangeQuery?.gt !== undefined) rangeValue.gt = rangeQuery.gt;
    if (rangeQuery?.lt !== undefined) rangeValue.lt = rangeQuery.lt;

    return {
      field,
      operator: 'range',
      value: rangeValue,
    };
  }

  if (query.terms) {
    const values = query.terms[field];
    return {
      field,
      operator: meta.negate ? 'is_not_one_of' : 'is_one_of',
      value: Array.isArray(values) ? values : [values],
    };
  }

  if (query.term) {
    const value = query.term[field];
    return {
      field,
      operator: meta.negate ? 'is_not' : 'is',
      value,
    };
  }

  if (query.match) {
    const matchField = Object.keys(query.match)[0];
    const matchValue = query.match[matchField];
    const value = typeof matchValue === 'object' ? matchValue.query : matchValue;

    return {
      field: matchField, // Use the field from the query, not meta
      operator: meta.negate ? 'is_not' : 'is',
      value,
    };
  }

  if (query.match_phrase) {
    const phraseField = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[phraseField];
    return {
      field: phraseField, // Use the field from the query, not meta
      operator: meta.negate ? 'is_not' : 'is',
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Fallback - try to extract from meta.params
  // Note: params can be various types; checking for object with query property
  const params = meta.params as { query?: unknown } | undefined;
  if (params && typeof params === 'object' && 'query' in params && params.query !== undefined) {
    return {
      field,
      operator: meta.negate ? 'is_not' : 'is',
      value: params.query as string | number | boolean,
    };
  }

  throw new FilterConversionError(`Unsupported query structure: ${JSON.stringify(query)}`);
}

/**
 * Convert stored filter to filter group
 */
export function convertToFilterGroup(storedFilter: Filter): FilterGroup {
  // Handle combined filter format (legacy): meta.type === 'combined' with params array
  if (storedFilter.meta?.type === 'combined' && Array.isArray(storedFilter.meta.params)) {
    // ExtendedFilter type includes optional 'relation' property
    const type = storedFilter.meta.relation === 'OR' ? 'OR' : 'AND';

    // Type guard: params should be Filter[] for combined filters
    const params = storedFilter.meta.params;
    if (!Array.isArray(params) || params.some((p) => typeof p === 'string')) {
      throw new FilterConversionError('Combined filter params must be Filter array');
    }

    const conditions: Array<SimpleFilterCondition | FilterGroup> = (params as Filter[]).map(
      (param) => {
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
      }
    );

    return {
      type,
      conditions,
    };
  }

  // Handle bool query format (modern)
  const query = storedFilter.query?.bool;
  if (!query) {
    throw new FilterConversionError('Expected bool query or combined meta for group filter');
  }

  const type = query.must ? 'AND' : 'OR';
  const clausesRaw = query.must || query.should || [];
  const clauses = Array.isArray(clausesRaw) ? clausesRaw : [clausesRaw];

  const conditions: Array<SimpleFilterCondition | FilterGroup> = clauses.map((clause: unknown) => {
    // Create a mock stored filter for each clause to convert recursively
    const mockStored: Filter = {
      meta: storedFilter.meta,
      query: clause as any,
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
export function convertWithEnhancement(storedFilter: Filter): SimpleFilterCondition {
  // Handle query-based filters (legacy filters already migrated to query format)
  if (storedFilter.query) {
    return parseQueryFilter(storedFilter);
  }

  throw new FilterConversionError('Filter is not enhancement-compatible');
}

/**
 * Parse query-based filters (match_phrase, range, exists, etc.)
 */
export function parseQueryFilter(storedFilter: Filter): SimpleFilterCondition {
  // Cast to any to access dynamic query properties
  const query = storedFilter.query as any;
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
      operator: meta.negate ? 'is_not' : 'is',
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Handle match queries with phrase type
  if (query.match) {
    const field = Object.keys(query.match)[0];
    const config = query.match[field];

    // Check if this is a phrase-type match query
    if (config.type === 'phrase' || (typeof config === 'object' && config.query)) {
      return {
        field,
        operator: meta.negate ? 'is_not' : 'is',
        value: config.query || config,
      };
    }
  }

  // Handle range queries
  if (query.range) {
    const field = Object.keys(query.range)[0];
    const rangeConfig = query.range[field];

    return {
      field,
      operator: 'range',
      value: rangeConfig,
    };
  }

  // Handle term queries
  if (query.term) {
    const field = Object.keys(query.term)[0];
    const value = query.term[field];

    return {
      field,
      operator: meta.negate ? 'is_not' : 'is',
      value,
    };
  }

  // Handle terms queries (multiple values)
  if (query.terms) {
    const field = Object.keys(query.terms)[0];
    const values = query.terms[field];

    return {
      field,
      operator: meta.negate ? 'is_not_one_of' : 'is_one_of',
      value: values,
    };
  }

  // Handle exists queries
  if (query.exists) {
    return {
      field: query.exists.field,
      operator: meta.negate ? 'not_exists' : 'exists',
    };
  }

  throw new FilterConversionError('Query type not supported for enhancement');
}

/**
 * STRATEGY 3: Convert to RawDSL with preservation reason
 */
export function convertToRawDSLWithReason(storedFilter: Filter): RawDSLFilter {
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

  // Cast to any to access dynamic query properties
  const q = query as any;

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
