/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { mode } = require('../../src/functions/mode');

describe('Mode', () => {
  it('numbers', () => {
    expect(mode(1)).toEqual(1);
    expect(mode(10, 2, 5, 8)).toEqual([2, 5, 8, 10]);
    expect(mode(0.1, 0.2, 0.4, 0.3)).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(mode(1, 1, 2, 3, 1, 4, 3, 2, 4)).toEqual([1]);
  });

  it('arrays & numbers', () => {
    expect(mode([10, 20, 30, 40], 10, 20, 30)).toEqual([[10], [20], [30], [10, 20, 30, 40]]);
    expect(mode([1, 2, 3, 4], 2, 3, [3, 2, 4, 3])).toEqual([[3], [2], [3], [3]]);
  });

  it('arrays', () => {
    expect(mode([1, 2, 3, 4], [1, 2, 5, 10])).toEqual([[1], [2], [3, 5], [4, 10]]);
    expect(mode([1, 2, 3, 4], [1, 2, 1, 2], [2, 3, 2, 3], [4, 3, 2, 3])).toEqual([
      [1],
      [2, 3],
      [2],
      [3],
    ]);
  });

  it('array length mismatch', () => {
    expect(() => mode([1, 2], [3])).toThrow();
  });
});
