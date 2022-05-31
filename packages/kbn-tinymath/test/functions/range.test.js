/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { range } = require('../../src/functions/range');

describe('Range', () => {
  it('numbers', () => {
    expect(range(1)).toEqual(0);
    expect(range(10, 2, 5, 8)).toEqual(8);
    expect(range(0.1, 0.2, 0.4, 0.3)).toEqual(0.4 - 0.1);
  });

  it('arrays & numbers', () => {
    expect(range([88, 20, 30, 40], 60, [30, 10, 70, 90])).toEqual([58, 50, 40, 50]);
    expect(range(10, [10, 20, 30, 40], [1, 2, 3, 4], 22)).toEqual([21, 20, 27, 36]);
  });

  it('arrays', () => {
    expect(range([1, 2, 3, 4])).toEqual(3);
    expect(range([6, 2, 3, 10], [11, 2, 5, 10])).toEqual([5, 0, 2, 0]);
    expect(range([30, 55, 9, 4], [72, 24, 48, 10], [10, 20, 30, 40])).toEqual([62, 35, 39, 36]);
    expect(range([11, 28, 60, 10], [1, 48, 3, -17])).toEqual([10, 20, 57, 27]);
  });

  it('array length mismatch', () => {
    expect(() => range([1, 2], [3])).toThrow();
  });
});
