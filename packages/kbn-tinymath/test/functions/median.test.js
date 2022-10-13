/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { median } = require('../../src/functions/median');

describe('Median', () => {
  it('numbers', () => {
    expect(median(1)).toEqual(1);
    expect(median(10, 2, 5, 8)).toEqual((8 + 5) / 2);
    expect(median(0.1, 0.2, 0.4, 0.3)).toEqual((0.2 + 0.3) / 2);
  });

  it('arrays & numbers', () => {
    expect(median([10, 20, 30, 40], 10, 20, 30)).toEqual([15, 20, 25, 25]);
    expect(median(10, [10, 20, 30, 40], [1, 2, 3, 4], 22)).toEqual([10, 15, 16, 16]);
  });

  it('arrays', () => {
    expect(median([1, 2, 3, 4], [1, 2, 5, 10])).toEqual([1, 2, 4, 7]);
    expect(median([1, 2, 3, 4], [1, 2, 5, 10], [10, 20, 30, 40])).toEqual([1, 2, 5, 10]);
    expect(median([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([12 / 2, 50 / 2, 63 / 2, 76 / 2]);
  });

  it('array length mismatch', () => {
    expect(() => median([1, 2], [3])).toThrow();
  });
});
