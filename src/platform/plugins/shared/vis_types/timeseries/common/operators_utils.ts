/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gt, gte, lt, lte, isNull } from 'lodash';

export enum Operator {
  Gte = 'gte',
  Lte = 'lte',
  Gt = 'gt',
  Lt = 'lt',
  Empty = 'empty',
}

export interface Rule {
  operator: Operator;
  value: unknown;
}

type OperatorsAllowNullType = {
  [name in Operator]?: boolean;
};

const OPERATORS = {
  [Operator.Gte]: gte,
  [Operator.Lte]: lte,
  [Operator.Gt]: gt,
  [Operator.Lt]: lt,
  [Operator.Empty]: isNull,
};

const OPERATORS_ALLOW_NULL: OperatorsAllowNullType = {
  [Operator.Empty]: true,
};

export const getOperator = (operator: Operator) => {
  return OPERATORS[operator];
};

// This check is necessary for preventing from comparing null values with numeric rules.
export const shouldOperate = (rule: Rule, value: unknown) =>
  (isNull(rule.value) && OPERATORS_ALLOW_NULL[rule.operator]) ||
  (!isNull(rule.value) && !isNull(value));
