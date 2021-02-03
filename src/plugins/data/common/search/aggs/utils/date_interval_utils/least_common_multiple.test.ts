/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { leastCommonMultiple } from './least_common_multiple';

describe('leastCommonMultiple', () => {
  const tests: Array<[number, number, number]> = [
    [3, 5, 15],
    [1, 1, 1],
    [5, 6, 30],
    [3, 9, 9],
    [8, 20, 40],
    [5, 5, 5],
    [0, 5, 0],
    [-4, -5, 20],
    [-2, -3, 6],
    [-8, 2, 8],
    [-8, 5, 40],
  ];

  tests.map(([a, b, expected]) => {
    test(`should return ${expected} for leastCommonMultiple(${a}, ${b})`, () => {
      expect(leastCommonMultiple(a, b)).toBe(expected);
    });
  });
});
