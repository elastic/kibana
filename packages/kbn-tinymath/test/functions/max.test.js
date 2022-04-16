/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { max } = require('../../src/functions/max');

describe('Max', () => {
  it('numbers', () => {
    expect(max(1)).toEqual(1);
    expect(max(10, 2, 5, 8)).toEqual(10);
    expect(max(0.1, 0.2, 0.4, 0.3)).toEqual(0.4);
  });

  it('arrays & numbers', () => {
    expect(max([88, 20, 30, 40], 60, [30, 10, 70, 90])).toEqual([88, 60, 70, 90]);
    expect(max(10, [10, 20, 30, 40], [1, 2, 3, 4], 22)).toEqual([22, 22, 30, 40]);
  });

  it('arrays', () => {
    expect(max([1, 2, 3, 4])).toEqual(4);
    expect(max([6, 2, 3, 10], [11, 2, 5, 10])).toEqual([11, 2, 5, 10]);
    expect(max([30, 55, 9, 4], [72, 24, 48, 10], [10, 20, 30, 40])).toEqual([72, 55, 48, 40]);
    expect(max([11, 28, 60, 10], [1, 48, 3, -17])).toEqual([11, 48, 60, 10]);
  });

  it('array length mismatch', () => {
    expect(() => max([1, 2], [3])).toThrow('Array length mismatch');
  });
});
