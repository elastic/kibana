/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SimpleFilter operator constants
 * These operators are used in SimpleFilterCondition to specify how to match field values
 */
export const SIMPLE_FILTER_OPERATOR = {
  IS: 'is',
  IS_NOT: 'is_not',
  IS_ONE_OF: 'is_one_of',
  IS_NOT_ONE_OF: 'is_not_one_of',
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists',
  RANGE: 'range',
} as const;

/**
 * Array of all valid filter operators
 */
export const FILTER_OPERATORS = [
  SIMPLE_FILTER_OPERATOR.IS,
  SIMPLE_FILTER_OPERATOR.IS_NOT,
  SIMPLE_FILTER_OPERATOR.IS_ONE_OF,
  SIMPLE_FILTER_OPERATOR.IS_NOT_ONE_OF,
  SIMPLE_FILTER_OPERATOR.EXISTS,
  SIMPLE_FILTER_OPERATOR.NOT_EXISTS,
  SIMPLE_FILTER_OPERATOR.RANGE,
] as const;

/**
 * Union type of all valid filter operators
 */
export type FilterOperator = (typeof FILTER_OPERATORS)[number];
