/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gt, gte, lt, lte, isNull } from 'lodash';

type Operator = 'gte' | 'lte' | 'gt' | 'lt' | 'empty';

export const GTE: Operator = 'gte';
export const LTE: Operator = 'lte';
export const GT: Operator = 'gt';
export const LT: Operator = 'lt';
export const EMPTY: Operator = 'empty';

export interface Rule {
  operator: Operator;
  value: unknown;
}

type OperatorsAllowNullType = {
  [name in Operator]?: boolean;
};

const OPERATORS = {
  [GTE]: gte,
  [LTE]: lte,
  [GT]: gt,
  [LT]: lt,
  [EMPTY]: isNull,
};

const OPERATORS_ALLOW_NULL: OperatorsAllowNullType = {
  [EMPTY]: true,
};

export const getOperator = (operator: Operator) => {
  return OPERATORS[operator];
};

// This check is necessary for preventing from comparing null values with numeric rules.
export const shouldOperate = (rule: Rule, value: unknown) =>
  (isNull(rule.value) && OPERATORS_ALLOW_NULL[rule.operator]) ||
  (!isNull(rule.value) && !isNull(value));
