/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * FilterTransformer: Bi-directional conversion between SimplifiedFilter and stored Filter formats
 *
 * This utility provides runtime conversion between the new SimplifiedFilter interface
 * and the existing stored Filter format used in saved objects and URL state.
 */

import type {
  Filter as StoredFilter,
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
  RangeValue,
} from '@kbn/es-query-server';
import type { Serializable } from '@kbn/utility-types';
import { FilterStateStore } from '../..';
import type { ValidationResult, ValidationError } from './types';
import { FilterConversionError } from './errors';

// ====================================================================
// FILTER TRANSFORMER IMPLEMENTATION
// ====================================================================

export class FilterTransformer {
  /**
   * Convert stored Filter (from saved objects/URL state) to SimplifiedFilter
   * Uses 3-tier approach: Full Compatibility -> Enhanced Compatibility -> Preserve Original
   */
  static fromStoredFilter(storedFilter: any): SimplifiedFilter {
    try {
      // Handle null/undefined input
      if (!storedFilter) {
        throw new FilterConversionError('Cannot convert null or undefined filter');
      }

      // Extract base properties from stored filter
      const baseProperties = this.extractBaseProperties(storedFilter);

      // TIER 1: Full Compatibility - Direct SimplifiedFilter conversion
      if (this.isFullyCompatible(storedFilter)) {
        try {
          const condition = this.convertToSimpleCondition(storedFilter);
          return {
            ...baseProperties,
            condition,
          } as SimplifiedFilter;
        } catch (conversionError) {
          // If conversion fails, fall through to DSL handling
        }
      }

      // TIER 2: Enhanced Compatibility - Parse and simplify when possible
      if (this.isEnhancedCompatible(storedFilter)) {
        try {
          const condition = this.convertWithEnhancement(storedFilter);
          return {
            ...baseProperties,
            condition,
          } as SimplifiedFilter;
        } catch (conversionError) {
          // If conversion fails, fall through to DSL handling
        }
      }

      // Handle grouped filters
      if (this.isStoredGroupFilter(storedFilter)) {
        try {
          const group = this.convertToFilterGroup(storedFilter);
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
        dsl: this.convertToRawDSLWithReason(storedFilter),
      } as SimplifiedFilter;
    } catch (error) {
      if (error instanceof FilterConversionError) {
        throw error;
      }
      throw new FilterConversionError(
        `Failed to convert stored filter: ${
          error instanceof Error ? error.message : String(error)
        }`,
        storedFilter
      );
    }
  }

  /**
   * Convert SimplifiedFilter to stored Filter for runtime compatibility
   */
  static toStoredFilter(simplified: SimplifiedFilter): StoredFilter {
    try {
      this.validateSimplifiedFilter(simplified);

      // Build base stored filter structure
      const storedFilter: StoredFilter = {
        $state: {
          store: simplified.pinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
        },
        meta: {
          alias: simplified.label || null,
          disabled: simplified.disabled || false,
          negate: simplified.negate || false,
          controlledBy: simplified.controlledBy,
          index: simplified.indexPattern,
        },
      };

      // Convert based on filter type using type guards
      if (this.isConditionFilter(simplified)) {
        return this.convertFromSimpleCondition(simplified.condition, storedFilter);
      }

      if (this.isGroupFilter(simplified)) {
        return this.convertFromFilterGroup(simplified.group, storedFilter);
      }

      if (this.isDSLFilter(simplified)) {
        return this.convertFromDSLFilter(simplified.dsl, storedFilter);
      }

      throw new FilterConversionError(
        'SimplifiedFilter must have exactly one of: condition, group, or dsl'
      );
    } catch (error) {
      if (error instanceof FilterConversionError) {
        throw error;
      }
      throw new FilterConversionError(
        `Failed to convert simplified filter: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate SimplifiedFilter structure and values
   */
  static validate(filter: SimplifiedFilter): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Check discriminated union constraint using type guards
      const hasCondition = this.isConditionFilter(filter);
      const hasGroup = this.isGroupFilter(filter);
      const hasDSL = this.isDSLFilter(filter);

      const count = [hasCondition, hasGroup, hasDSL].filter(Boolean).length;

      if (count === 0) {
        errors.push({
          path: 'root',
          message: 'Filter must have exactly one of: condition, group, or dsl',
          code: 'MISSING_FILTER_TYPE',
        });
      } else if (count > 1) {
        errors.push({
          path: 'root',
          message: 'Filter cannot have multiple types (condition, group, dsl) simultaneously',
          code: 'MULTIPLE_FILTER_TYPES',
        });
      }

      // Validate specific filter types using type guards
      if (this.isConditionFilter(filter)) {
        this.validateSimpleCondition(filter.condition, errors);
      }

      if (this.isGroupFilter(filter)) {
        this.validateFilterGroup(filter.group, errors);
      }

      if (this.isDSLFilter(filter)) {
        this.validateDSLFilter(filter.dsl, errors);
      }

      // Add warnings for potentially problematic configurations
      if (filter.disabled && filter.pinned) {
        warnings.push('Pinned filters are typically not disabled');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      errors.push({
        path: 'root',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
      });

      return {
        valid: false,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  // ====================================================================
  // PRIVATE HELPER METHODS
  // ====================================================================

  private static extractBaseProperties(storedFilter: any): Partial<SimplifiedFilter> {
    return {
      id: storedFilter.meta?.key || undefined,
      pinned: storedFilter.$state?.store === 'globalState' || undefined,
      disabled: storedFilter.meta?.disabled || undefined,
      controlledBy: storedFilter.meta?.controlledBy || undefined,
      indexPattern: storedFilter.meta?.index || undefined,
      metadata: storedFilter.meta?.params || undefined,
      negate: storedFilter.meta?.negate || undefined,
      label: storedFilter.meta?.alias || undefined,
    };
  }

  private static isStoredGroupFilter(storedFilter: any): boolean {
    // Detect if this represents a grouped filter with multiple conditions
    return Boolean(
      storedFilter.query?.bool &&
        (storedFilter.query.bool.must?.length > 1 || storedFilter.query.bool.should?.length > 1)
    );
  }

  // ====================================================================
  // TIER DETECTION METHODS
  // ====================================================================

  /**
   * TIER 1: Full Compatibility - Can be directly converted to SimplifiedFilter
   */
  private static isFullyCompatible(storedFilter: any): boolean {
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
   * TIER 2: Enhanced Compatibility - Can be parsed and simplified
   */
  private static isEnhancedCompatible(storedFilter: any): boolean {
    // Check for simplifiable query structures
    if (storedFilter.query?.match_phrase || storedFilter.query?.match) {
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

  private static convertToSimpleCondition(storedFilter: any): SimpleFilterCondition {
    const meta = storedFilter.meta || {};
    const query = storedFilter.query || {};

    // Extract field name
    const field = meta.key || meta.field || this.extractFieldFromQuery(query);
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
      const value = query.match[field];
      return {
        ...baseCondition,
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

  private static convertToFilterGroup(storedFilter: any): FilterGroup {
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
      return this.convertToSimpleCondition(mockStored);
    });

    return {
      type,
      conditions,
    };
  }

  // ====================================================================
  // ENHANCED CONVERSION METHODS
  // ====================================================================

  /**
   * TIER 2: Convert with enhancement - parse complex structures when possible
   */
  private static convertWithEnhancement(storedFilter: any): SimpleFilterCondition {
    // Handle query-based filters
    if (storedFilter.query) {
      return this.parseQueryFilter(storedFilter);
    }

    // Handle legacy filter structures
    if (storedFilter.range || storedFilter.exists) {
      return this.parseLegacyFilter(storedFilter);
    }

    throw new FilterConversionError('Filter is not enhancement-compatible');
  }

  /**
   * Parse query-based filters (match_phrase, range, exists, etc.)
   */
  private static parseQueryFilter(storedFilter: any): SimpleFilterCondition {
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

      if (config.type === 'phrase') {
        return {
          field,
          operator: 'is',
          value: config.query,
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

    // Handle exists queries
    if (query.exists) {
      return {
        field: query.exists.field,
        operator: 'exists',
      };
    }

    throw new FilterConversionError('Query type not supported for enhancement');
  }

  /**
   * Parse legacy filter structures (pre-query format)
   */
  private static parseLegacyFilter(storedFilter: any): SimpleFilterCondition {
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
  private static convertToRawDSLWithReason(storedFilter: any): RawDSLFilter {
    // Preserved as RawDSL for maximum compatibility
    return {
      query: storedFilter.query || storedFilter,
    };
  }

  private static convertFromSimpleCondition(
    condition: SimpleFilterCondition,
    baseStored: StoredFilter
  ): StoredFilter {
    // Build query and meta based on operator
    let query: Record<string, any>;
    let meta: Serializable = {
      ...baseStored.meta,
      key: condition.field,
      field: condition.field,
      type: this.getFilterTypeForOperator(condition.operator),
    };

    switch (condition.operator) {
      case 'exists':
        query = { exists: { field: condition.field } };
        break;

      case 'not_exists':
        query = { exists: { field: condition.field } };
        meta = { ...meta, negate: true };
        break;

      case 'is':
        query = { term: { [condition.field]: condition.value } };
        meta = { ...meta, params: { query: condition.value } };
        break;

      case 'is_not':
        query = { term: { [condition.field]: condition.value } };
        meta = { ...meta, negate: true, params: { query: condition.value } };
        break;

      case 'is_one_of':
        query = { terms: { [condition.field]: condition.value } };
        meta = { ...meta, params: { terms: condition.value } };
        break;

      case 'is_not_one_of':
        query = { terms: { [condition.field]: condition.value } };
        meta = { ...meta, negate: true, params: { terms: condition.value } };
        break;

      case 'range':
        const rangeValue = condition.value as RangeValue;
        query = { range: { [condition.field]: rangeValue } };
        meta = { ...meta, params: rangeValue };
        break;

      default:
        // @ts-expect-error - This should never happen due to validation constraints
        throw new FilterConversionError(`Unsupported operator: ${condition.operator}`);
    }

    return {
      ...baseStored,
      query,
      meta,
    };
  }

  private static convertFromFilterGroup(
    group: FilterGroup,
    baseStored: StoredFilter
  ): StoredFilter {
    const meta = {
      ...baseStored.meta,
    };

    // Convert conditions to query clauses
    const clauses = group.conditions.map((condition) => {
      const typedCondition = condition as SimpleFilterCondition | FilterGroup;
      if (this.isNestedFilterGroup(typedCondition)) {
        // Nested group - recursively convert
        const nestedStored = this.convertFromFilterGroup(typedCondition, baseStored);
        return nestedStored.query;
      } else {
        // Simple condition
        const conditionStored = this.convertFromSimpleCondition(typedCondition, baseStored);
        return conditionStored.query;
      }
    });

    // Build bool query
    const boolQuery: any = {};
    boolQuery[group.type === 'AND' ? 'must' : 'should'] = clauses;

    if (group.type === 'OR') {
      boolQuery.minimum_should_match = 1;
    }

    return {
      ...baseStored,
      query: { bool: boolQuery },
      meta,
    };
  }

  private static convertFromDSLFilter(dsl: RawDSLFilter, baseStored: StoredFilter): StoredFilter {
    const meta = {
      ...baseStored.meta,
      type: 'custom',
    };

    return {
      ...baseStored,
      query: dsl.query,
      meta,
    };
  }

  // ====================================================================
  // VALIDATION HELPERS
  // ====================================================================

  private static validateSimplifiedFilter(filter: SimplifiedFilter): void {
    const validationResult = this.validate(filter);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map((e) => e.message).join(', ');
      throw new FilterConversionError(`Invalid SimplifiedFilter: ${errorMessages}`);
    }
  }

  private static validateSimpleCondition(
    condition: SimpleFilterCondition,
    errors: ValidationError[]
  ): void {
    if (!condition.field?.trim()) {
      errors.push({
        path: 'condition.field',
        message: 'Field name is required and cannot be empty',
        code: 'INVALID_FIELD',
      });
    }

    // Validate operator-specific constraints using type guards
    if (
      this.isExistenceCondition(condition) &&
      'value' in condition &&
      condition.value !== undefined
    ) {
      errors.push({
        path: 'condition.value',
        message: 'Exists/not_exists operators should not have a value',
        code: 'UNEXPECTED_VALUE',
      });
    }

    if (
      this.isConditionWithValue(condition) &&
      (!('value' in condition) || condition.value === undefined)
    ) {
      errors.push({
        path: 'condition.value',
        message: 'Value is required for non-existence operators',
        code: 'MISSING_VALUE',
      });
    }
  }

  private static validateFilterGroup(group: FilterGroup, errors: ValidationError[]): void {
    if (!group.conditions?.length) {
      errors.push({
        path: 'group.conditions',
        message: 'Filter group must have at least one condition',
        code: 'EMPTY_GROUP',
      });
    }

    // Recursively validate conditions
    group.conditions?.forEach((condition) => {
      const typedCondition = condition as SimpleFilterCondition | FilterGroup;
      if (this.isNestedFilterGroup(typedCondition)) {
        this.validateFilterGroup(typedCondition, errors);
      } else {
        this.validateSimpleCondition(typedCondition, errors);
      }
    });
  }

  private static validateDSLFilter(dsl: RawDSLFilter, errors: ValidationError[]): void {
    if (!dsl.query || typeof dsl.query !== 'object') {
      errors.push({
        path: 'dsl.query',
        message: 'DSL query must be a valid object',
        code: 'INVALID_DSL',
      });
    }
  }

  // ====================================================================
  // TYPE GUARDS
  // ====================================================================

  /**
   * Type guard to check if filter has a condition property
   */
  private static isConditionFilter(
    filter: SimplifiedFilter
  ): filter is SimplifiedFilter & { condition: SimpleFilterCondition } {
    return 'condition' in filter && filter.condition !== undefined;
  }

  /**
   * Type guard to check if filter has a group property
   */
  private static isGroupFilter(
    filter: SimplifiedFilter
  ): filter is SimplifiedFilter & { group: FilterGroup } {
    return 'group' in filter && filter.group !== undefined;
  }

  /**
   * Type guard to check if filter has a dsl property
   */
  private static isDSLFilter(
    filter: SimplifiedFilter
  ): filter is SimplifiedFilter & { dsl: RawDSLFilter } {
    return 'dsl' in filter && filter.dsl !== undefined;
  }

  /**
   * Type guard to check if condition requires a value
   */
  private static isConditionWithValue(
    condition: SimpleFilterCondition
  ): condition is SimpleFilterCondition & { value: any } {
    return !['exists', 'not_exists'].includes(condition.operator);
  }

  /**
   * Type guard to check if condition is existence-only
   */
  private static isExistenceCondition(
    condition: SimpleFilterCondition
  ): condition is SimpleFilterCondition & { operator: 'exists' | 'not_exists' } {
    return ['exists', 'not_exists'].includes(condition.operator);
  }

  /**
   * Type guard to check if condition is a nested FilterGroup
   */
  private static isNestedFilterGroup(
    condition: SimpleFilterCondition | FilterGroup
  ): condition is FilterGroup {
    return 'conditions' in condition && Array.isArray((condition as any).conditions);
  }

  // ====================================================================
  // UTILITY HELPERS
  // ====================================================================

  private static extractFieldFromQuery(query: any): string | null {
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

  private static getFilterTypeForOperator(operator: string): string {
    switch (operator) {
      case 'exists':
      case 'not_exists':
        return 'exists';
      case 'range':
        return 'range';
      case 'is_one_of':
      case 'is_not_one_of':
        return 'terms';
      default:
        return 'phrase';
    }
  }
}
