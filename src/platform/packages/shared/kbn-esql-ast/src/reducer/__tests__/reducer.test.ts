/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '../../..';
import { Reducer } from '../reducer';

const evaluate = (expression: string): number => {
  const tree = synth.expr(expression);
  return Reducer.reduce<number>(tree, {
    up: (ctx, data) => {
      switch (ctx.node.type) {
        case 'literal':
          return Number(ctx.node.value);
        case 'function': {
          switch (ctx.node.name) {
            case '+': {
              return data[0] + data[1];
            }
            case '-': {
              return data[0] - data[1];
            }
            case '*': {
              return data[0] * data[1];
            }
            case '/': {
              return data[0] / data[1];
            }
            case '%': {
              return data[0] % data[1];
            }
            case 'abs': {
              return Math.abs(data[0]);
            }
          }
        }
      }
      return 0;
    },
  })!;
};

test('can evaluate expression', () => {
  expect(evaluate('1 + 1')).toBe(2);
  expect(evaluate('1 + 2 * 3')).toBe(7);
  expect(evaluate('(1 + 2) * 3')).toBe(9);
  expect(evaluate('1 + 2 * 3 - 4 / 2')).toBe(5);
  expect(evaluate('1 + 2 * (3 - 4) / 2')).toBe(0);
  expect(evaluate('abs(-5)')).toBe(5);
  expect(evaluate('abs(5)')).toBe(5);
  expect(evaluate('5 % 2')).toBe(1);
});
