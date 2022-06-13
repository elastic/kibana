/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { min } = require('../../src/functions/min');

describe('Min', () => {
  it('numbers', () => {
    expect(min(1)).toEqual(1);
    expect(min(10, 2, 5, 8)).toEqual(2);
    expect(min(0.1, 0.2, 0.4, 0.3)).toEqual(0.1);
  });

  it('arrays & numbers', () => {
    expect(min([88, 20, 30, 100], 60, [30, 10, 70, 90])).toEqual([30, 10, 30, 60]);
    expect(min([50, 20, 3, 40], 10, [13, 2, 34, 4], 22)).toEqual([10, 2, 3, 4]);
    expect(min(10, [50, 20, 3, 40], [13, 2, 34, 4], 22)).toEqual([10, 2, 3, 4]);
  });

  it('arrays', () => {
    expect(min([1, 2, 3, 4])).toEqual(1);
    expect(min([6, 2, 30, 10], [11, 2, 5, 15])).toEqual([6, 2, 5, 10]);
    expect(min([30, 55, 9, 4], [72, 24, 48, 10], [10, 20, 30, 40])).toEqual([10, 20, 9, 4]);
    expect(min([11, 28, 60, 10], [1, 48, 3, -17])).toEqual([1, 28, 3, -17]);
  });

  it('array length mismatch', () => {
    expect(() => min([1, 2], [3])).toThrow('Array length mismatch');
  });
});
