/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOperator, shouldOperate, Rule, Operator } from './operators_utils';

describe('getOperator(operator)', () => {
  test('should return operator function', () => {
    const operatorName = Operator.Gte;
    const operator = getOperator(operatorName);
    expect(typeof operator).toBe('function');
  });
});

describe('shouldOperate(rule, value)', () => {
  test('should operate, if value is not null and rule value is not null', () => {
    const rule: Rule = {
      value: 1,
      operator: Operator.Gte,
    };
    const value = 2;

    expect(shouldOperate(rule, value)).toBeTruthy();
  });

  test('should operate, if value is null and operator allows null value', () => {
    const rule: Rule = {
      operator: Operator.Empty,
      value: null,
    };
    const value = null;

    expect(shouldOperate(rule, value)).toBeTruthy();
  });

  test("should not operate, if value is null and operator doesn't allow null values", () => {
    const rule: Rule = {
      operator: Operator.Gte,
      value: 2,
    };
    const value = null;

    expect(shouldOperate(rule, value)).toBeFalsy();
  });

  test("should not operate, if rule value is null and operator doesn't allow null values", () => {
    const rule: Rule = {
      operator: Operator.Gte,
      value: null,
    };
    const value = 3;

    expect(shouldOperate(rule, value)).toBeFalsy();
  });
});
