/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gt, gte, lt, lte, isNull } from 'lodash';

type OPERATOR = 'gte' | 'lte' | 'gt' | 'lt' | 'empty';

export const GTE: OPERATOR = 'gte';
export const LTE: OPERATOR = 'lte';
export const GT: OPERATOR = 'gt';
export const LT: OPERATOR = 'lt';
export const EMPTY: OPERATOR = 'empty';

export interface Rule {
  operator: OPERATOR;
  value: unknown;
}

type OPERATORS_ALLOW_NULL_TYPE = {
  [p in OPERATOR]?: boolean;
};

const OPERATORS = {
  [GTE]: gte,
  [LTE]: lte,
  [GT]: gt,
  [LT]: lt,
  [EMPTY]: isNull,
};

const OPERATORS_ALLOW_NULL: OPERATORS_ALLOW_NULL_TYPE = {
  [EMPTY]: true,
};

export const getOperator = (operator: OPERATOR) => {
  return OPERATORS[operator];
};

// This check is necessary for preventing from comparing null values with numeric rules.
export const shouldOperate = (rule: Rule, value: unknown) =>
  (isNull(rule.value) && OPERATORS_ALLOW_NULL[rule.operator]) ||
  (!isNull(rule.value) && !isNull(value));
