/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { clamp } = require('../../src/functions/clamp');

describe('Clamp', () => {
  it('numbers', () => {
    expect(clamp(10, 5, 8)).toEqual(8);
    expect(clamp(1, 2, 3)).toEqual(2);
    expect(clamp(0.5, 0.2, 0.4)).toEqual(0.4);
    expect(clamp(3.58, 0, 1)).toEqual(1);
    expect(clamp(-0.48, 0, 1)).toEqual(0);
    expect(clamp(1.38, -1, 0)).toEqual(0);
  });

  it('arrays & numbers', () => {
    expect(clamp([10, 20, 30, 40], 15, 25)).toEqual([15, 20, 25, 25]);
    expect(clamp(10, [15, 2, 4, 20], 25)).toEqual([15, 10, 10, 20]);
    expect(clamp(5, 10, [20, 30, 40, 50])).toEqual([10, 10, 10, 10]);
    expect(clamp(35, 10, [20, 30, 40, 50])).toEqual([20, 30, 35, 35]);
    expect(clamp([1, 9], 3, [4, 5])).toEqual([3, 5]);
  });

  it('arrays', () => {
    expect(clamp([6, 28, 32, 10], [11, 2, 5, 10], [20, 21, 22, 23])).toEqual([11, 21, 22, 10]);
  });

  it('errors', () => {
    expect(() => clamp(1, 4, 3)).toThrow('Min must be less than max');
    expect(() => clamp([1, 2], [3], 3)).toThrow('Array length mismatch');
    expect(() => clamp([1, 2], [3], 3)).toThrow('Array length mismatch');
    expect(() => clamp(10, 20, null)).toThrow(
      "Missing maximum value. You may want to use the 'min' function instead"
    );
    expect(() => clamp([10, 20, 30, 40], 15, null)).toThrow(
      "Missing maximum value. You may want to use the 'min' function instead"
    );
    expect(() => clamp(10, null, 30)).toThrow(
      "Missing minimum value. You may want to use the 'max' function instead"
    );
    expect(() => clamp([11, 28, 60, 10], null, [1, 48, 3, -17])).toThrow(
      "Missing minimum value. You may want to use the 'max' function instead"
    );
  });
});
