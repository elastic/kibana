/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * FilterBuilder: Main fluent API for creating SimplifiedFilter instances
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
  FilterValue,
} from '@kbn/es-query-server';
import { SimpleFilterBuilder } from './simple_filter_builder';
import { FilterGroupBuilder } from './filter_group_builder';

export class FilterBuilder {
  private filter: Partial<SimplifiedFilter> = {};

  /**
   * Set filter ID
   */
  id(filterId: string): this {
    this.filter.id = filterId;
    return this;
  }

  /**
   * Pin the filter globally
   */
  pinned(pinned = true): this {
    this.filter.pinned = pinned;
    return this;
  }

  /**
   * Mark the filter as disabled
   */
  disabled(disabled = true): this {
    this.filter.disabled = disabled;
    return this;
  }

  /**
   * Set controlling plugin/component
   */
  controlledBy(controller: string): this {
    this.filter.controlledBy = controller;
    return this;
  }

  /**
   * Set index pattern
   */
  indexPattern(pattern: string): this {
    this.filter.indexPattern = pattern;
    return this;
  }

  /**
   * Set a display label for the filter
   */
  label(label: string): this {
    this.filter.label = label;
    return this;
  }

  /**
   * Negate the filter
   */
  negate(negate = true): this {
    this.filter.negate = negate;
    return this;
  }

  /**
   * Create a simple condition filter
   */
  condition(condition: SimpleFilterCondition): SimplifiedFilter {
    return {
      ...this.filter,
      condition,
    } as SimplifiedFilter;
  }

  /**
   * Create a group filter
   */
  group(group: FilterGroup): SimplifiedFilter {
    return {
      ...this.filter,
      group,
    } as SimplifiedFilter;
  }

  /**
   * Create a raw DSL filter
   */
  rawDSL(dslFilter: RawDSLFilter): SimplifiedFilter {
    return {
      ...this.filter,
      dsl: dslFilter,
    } as SimplifiedFilter;
  }

  /**
   * Start building a simple condition for a field
   */
  field(fieldName: string): SimpleFilterBuilder {
    return new SimpleFilterBuilder(fieldName);
  }

  /**
   * Start building a filter group
   */
  and(): FilterGroupBuilder {
    return new FilterGroupBuilder('AND');
  }

  /**
   * Start building an OR filter group
   */
  or(): FilterGroupBuilder {
    return new FilterGroupBuilder('OR');
  }

  /**
   * Create a raw DSL filter with query
   */
  dslQuery(query: Record<string, any>): SimplifiedFilter {
    return this.rawDSL({
      query,
    });
  }
}

// ====================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ====================================================================

/**
 * Create a new FilterBuilder instance
 */
export function createFilter(): FilterBuilder {
  return new FilterBuilder();
}

/**
 * Create a simple field filter builder
 */
export function field(fieldName: string): SimpleFilterBuilder {
  return new SimpleFilterBuilder(fieldName);
}

/**
 * Create an AND group builder
 */
export function and(): FilterGroupBuilder {
  return new FilterGroupBuilder('AND');
}

/**
 * Create an OR group builder
 */
export function or(): FilterGroupBuilder {
  return new FilterGroupBuilder('OR');
}

/**
 * Create a raw DSL filter
 */
export function dsl(query: Record<string, any>): RawDSLFilter {
  return {
    query,
  };
}

// ====================================================================
// COMMON FILTER PATTERNS
// ====================================================================

/**
 * Common filter patterns for quick creation
 */
export const FilterPatterns = {
  /**
   * Create a simple "field equals value" filter
   */
  equals(fieldName: string, value: FilterValue): SimplifiedFilter {
    return createFilter().condition(field(fieldName).is(value));
  },

  /**
   * Create a simple "field does not equal value" filter
   */
  notEquals(fieldName: string, value: FilterValue): SimplifiedFilter {
    return createFilter().condition(field(fieldName).isNot(value));
  },

  /**
   * Create a "field exists" filter
   */
  exists(fieldName: string): SimplifiedFilter {
    return createFilter().condition(field(fieldName).exists());
  },

  /**
   * Create a "field does not exist" filter
   */
  notExists(fieldName: string): SimplifiedFilter {
    return createFilter().condition(field(fieldName).notExists());
  },

  /**
   * Create a range filter
   */
  range(fieldName: string, from?: string | number, to?: string | number): SimplifiedFilter {
    const rangeValue: any = {};
    if (from !== undefined) rangeValue.gte = from;
    if (to !== undefined) rangeValue.lte = to;

    return createFilter().condition(field(fieldName).range(rangeValue));
  },

  /**
   * Create a terms filter (field is one of values)
   */
  terms(fieldName: string, values: FilterValue[]): SimplifiedFilter {
    return createFilter().condition(field(fieldName).isOneOf(values));
  },

  /**
   * Create a negated terms filter (field is not one of values)
   */
  notTerms(fieldName: string, values: FilterValue[]): SimplifiedFilter {
    return createFilter().condition(field(fieldName).isNotOneOf(values));
  },
};
