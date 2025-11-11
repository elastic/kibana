/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SimpleFilterBuilder: Fluent API for creating simple filter conditions
 */

import type { SimpleFilterCondition, FilterValue, RangeValue } from '@kbn/es-query-server';

export class SimpleFilterBuilder {
  private condition: Partial<SimpleFilterCondition> = {};

  constructor(fieldName: string) {
    this.condition.field = fieldName;
  }

  /**
   * Field equals value
   */
  is(value: FilterValue): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'is',
      value,
    } as SimpleFilterCondition;
  }

  /**
   * Field does not equal value
   */
  isNot(value: FilterValue): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'is_not',
      value,
    } as SimpleFilterCondition;
  }

  /**
   * Field is one of the provided values
   */
  isOneOf(values: FilterValue[]): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'is_one_of',
      value: values,
    } as SimpleFilterCondition;
  }

  /**
   * Field is not one of the provided values
   */
  isNotOneOf(values: FilterValue[]): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'is_not_one_of',
      value: values,
    } as SimpleFilterCondition;
  }

  /**
   * Field exists (has any value)
   */
  exists(): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'exists',
    } as SimpleFilterCondition;
  }

  /**
   * Field does not exist (is null/undefined)
   */
  notExists(): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'not_exists',
    } as SimpleFilterCondition;
  }

  /**
   * Field is within the specified range
   */
  range(rangeValue: RangeValue): SimpleFilterCondition {
    return {
      ...this.condition,
      operator: 'range',
      value: rangeValue,
    } as SimpleFilterCondition;
  }

  /**
   * Field is greater than or equal to value
   */
  gte(value: string | number): SimpleFilterCondition {
    return this.range({ gte: value });
  }

  /**
   * Field is less than or equal to value
   */
  lte(value: string | number): SimpleFilterCondition {
    return this.range({ lte: value });
  }

  /**
   * Field is greater than value
   */
  gt(value: string | number): SimpleFilterCondition {
    return this.range({ gt: value });
  }

  /**
   * Field is less than value
   */
  lt(value: string | number): SimpleFilterCondition {
    return this.range({ lt: value });
  }

  /**
   * Field is between two values (inclusive)
   */
  between(from: string | number, to: string | number): SimpleFilterCondition {
    return this.range({ gte: from, lte: to });
  }
}
