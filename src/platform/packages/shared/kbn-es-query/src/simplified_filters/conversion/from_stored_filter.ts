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
 * Uses 3-tier approach: Full Compatibility -> Enhanced Compatibility -> Preserve Original
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
  RangeValue,
} from '@kbn/es-query-server';
import { FilterConversionError } from '../errors';
import { extractBaseProperties } from './utils';
import {
  isFullyCompatible,
  isEnhancedCompatible,
  isStoredGroupFilter,
  requiresHighFidelity,
  isPhraseFilterWithQuery,
} from './type_guards';

/**
 * Convert stored Filter (from saved objects/URL state) to SimplifiedFilter
 * Uses 3-tier approach: Full Compatibility -> Enhanced Compatibility -> Preserve Original
 */
export function fromStoredFilter(storedFilter: any): SimplifiedFilter {
  try {
    // Handle null/undefined input
    if (!storedFilter) {
      throw new FilterConversionError('Cannot convert null or undefined filter');
    }

    // Extract base properties from stored filter
    const baseProperties = extractBaseProperties(storedFilter);

    // TIER 1: Full Compatibility - Direct SimplifiedFilter conversion
    if (isFullyCompatible(storedFilter)) {
      try {
        const condition = convertToSimpleCondition(storedFilter);
        return {
          ...baseProperties,
          condition,
        } as SimplifiedFilter;
      } catch (conversionError) {
        // If conversion fails, fall through to enhanced handling
      }
    }

    // TIER 2: Enhanced Compatibility - Parse and simplify when possible
    // This now includes phrase filters with match_phrase queries
    if (isEnhancedCompatible(storedFilter) || isPhraseFilterWithQuery(storedFilter)) {
      try {
        const condition = convertWithEnhancement(storedFilter);
        return {
          ...baseProperties,
          condition,
        } as SimplifiedFilter;
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // TIER 2.5: High-Fidelity Check - Preserve as DSL only for truly complex cases
    if (requiresHighFidelity(storedFilter)) {
      return {
        ...baseProperties,
        dsl: convertToRawDSLWithReason(storedFilter),
      } as SimplifiedFilter;
    }

    // Handle grouped filters
    if (isStoredGroupFilter(storedFilter)) {
      try {
        const group = convertToFilterGroup(storedFilter);
        return {
          ...baseProperties,
          group,
        } as SimplifiedFilter;
      } catch (conversionError) {
        // If conversion fails, fall through to DSL handling
      }
    }

    // TIER 3: Preserve Original - No data loss, keep as RawDSL
    return {
      ...baseProperties,
      dsl: convertToRawDSLWithReason(storedFilter),
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
 * Convert stored filter to simple condition (Tier 1 & 2)
 */
export function convertToSimpleCondition(storedFilter: any): SimpleFilterCondition {
  const meta = storedFilter.meta || {};
  const query = storedFilter.query || {};

  // Extract field name
  const field = meta.key || meta.field || extractFieldFromQuery(query);
  if (!field) {
    throw new FilterConversionError('Cannot determine field name from stored filter');
  }

  // Build base condition
  const baseCondition = {
    field,
    label: meta.alias || undefined,
    disabled: meta.disabled || undefined,
  };

  // Determine operator and value based on query structure
  if (query.exists) {
    return {
      ...baseCondition,
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
      ...baseCondition,
      operator: 'range',
      value: rangeValue,
    };
  }

  if (query.terms) {
    const values = query.terms[field];
    return {
      ...baseCondition,
      operator: meta.negate ? 'is_not_one_of' : 'is_one_of',
      value: Array.isArray(values) ? values : [values],
    };
  }

  if (query.term) {
    const value = query.term[field];
    return {
      ...baseCondition,
      operator: meta.negate ? 'is_not' : 'is',
      value,
    };
  }

  if (query.match) {
    const matchField = Object.keys(query.match)[0];
    const matchValue = query.match[matchField];
    const value = typeof matchValue === 'object' ? matchValue.query : matchValue;

    return {
      ...baseCondition,
      field: matchField, // Use the field from the query, not meta
      operator: meta.negate ? 'is_not' : 'is',
      value,
    };
  }

  if (query.match_phrase) {
    const phraseField = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[phraseField];
    return {
      ...baseCondition,
      field: phraseField, // Use the field from the query, not meta
      operator: meta.negate ? 'is_not' : 'is',
      value: typeof value === 'object' ? value.query : value,
    };
  }

  // Fallback - try to extract from meta.params
  if (meta.params?.query) {
    return {
      ...baseCondition,
      operator: meta.negate ? 'is_not' : 'is',
      value: meta.params.query,
    };
  }

  throw new FilterConversionError(`Unsupported query structure: ${JSON.stringify(query)}`);
}

/**
 * Convert stored filter to filter group
 */
export function convertToFilterGroup(storedFilter: any): FilterGroup {
  const query = storedFilter.query?.bool;
  if (!query) {
    throw new FilterConversionError('Expected bool query for group filter');
  }

  const type = query.must ? 'AND' : 'OR';
  const clauses = query.must || query.should || [];

  const conditions: Array<SimpleFilterCondition | FilterGroup> = clauses.map((clause: any) => {
    // Create a mock stored filter for each clause to convert recursively
    const mockStored = {
      meta: storedFilter.meta,
      query: clause,
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
 * TIER 2: Convert with enhancement - parse complex structures when possible
 */
export function convertWithEnhancement(storedFilter: any): SimpleFilterCondition {
  // Handle query-based filters
  if (storedFilter.query) {
    return parseQueryFilter(storedFilter);
  }

  // Handle legacy filter structures
  if (storedFilter.range || storedFilter.exists) {
    return parseLegacyFilter(storedFilter);
  }

  throw new FilterConversionError('Filter is not enhancement-compatible');
}

/**
 * Parse query-based filters (match_phrase, range, exists, etc.)
 */
export function parseQueryFilter(storedFilter: any): SimpleFilterCondition {
  const query = storedFilter.query;

  // Handle match_phrase queries
  if (query.match_phrase) {
    const field = Object.keys(query.match_phrase)[0];
    const value = query.match_phrase[field];

    return {
      field,
      operator: 'is',
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
        operator: 'is',
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
    const meta = storedFilter.meta || {};

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
    const meta = storedFilter.meta || {};

    return {
      field,
      operator: meta.negate ? 'is_not_one_of' : 'is_one_of',
      value: values,
    };
  }

  // Handle exists queries
  if (query.exists) {
    const meta = storedFilter.meta || {};
    return {
      field: query.exists.field,
      operator: meta.negate ? 'not_exists' : 'exists',
    };
  }

  throw new FilterConversionError('Query type not supported for enhancement');
}

/**
 * Parse legacy filter structures (pre-query format)
 */
export function parseLegacyFilter(storedFilter: any): SimpleFilterCondition {
  // Handle legacy range filters
  if (storedFilter.range) {
    const field = Object.keys(storedFilter.range)[0];
    const rangeConfig = storedFilter.range[field];

    return {
      field,
      operator: 'range',
      value: rangeConfig,
    };
  }

  // Handle legacy exists filters
  if (storedFilter.exists) {
    return {
      field: storedFilter.exists.field,
      operator: 'exists',
    };
  }

  throw new FilterConversionError('Legacy filter type not supported');
}

/**
 * TIER 3: Convert to RawDSL with preservation reason
 */
export function convertToRawDSLWithReason(storedFilter: any): RawDSLFilter {
  // Preserved as RawDSL for maximum compatibility
  return {
    query: storedFilter.query || storedFilter,
  };
}

/**
 * Extract field name from query structure
 */
export function extractFieldFromQuery(query: any): string | null {
  if (query.term) {
    return Object.keys(query.term)[0] || null;
  }
  if (query.terms) {
    return Object.keys(query.terms)[0] || null;
  }
  if (query.range) {
    return Object.keys(query.range)[0] || null;
  }
  if (query.exists) {
    return query.exists.field || null;
  }
  if (query.match) {
    return Object.keys(query.match)[0] || null;
  }
  return null;
}
