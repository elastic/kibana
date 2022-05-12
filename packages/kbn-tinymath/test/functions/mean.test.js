/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { mean } = require('../../src/functions/mean');

describe('Mean', () => {
  it('numbers', () => {
    expect(mean(1)).toEqual(1);
    expect(mean(10, 2, 5, 8)).toEqual(25 / 4);
    expect(mean(0.1, 0.2, 0.4, 0.3)).toEqual((0.1 + 0.2 + 0.3 + 0.4) / 4);
  });

  it('arrays & numbers', () => {
    expect(mean([10, 20, 30, 40], 10, 20, 30)).toEqual([70 / 4, 80 / 4, 90 / 4, 100 / 4]);
    expect(mean(10, [10, 20, 30, 40], [1, 2, 3, 4], 22)).toEqual([43 / 4, 54 / 4, 65 / 4, 76 / 4]);
  });

  it('arrays', () => {
    expect(mean([1, 2, 3, 4])).toEqual(10 / 4);
    expect(mean([1, 2, 3, 4], [1, 2, 5, 10])).toEqual([2 / 2, 4 / 2, 8 / 2, 14 / 2]);
    expect(mean([1, 2, 3, 4], [1, 2, 5, 10], [10, 20, 30, 40])).toEqual([
      12 / 3,
      24 / 3,
      38 / 3,
      54 / 3,
    ]);
    expect(mean([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([12 / 2, 50 / 2, 63 / 2, 76 / 2]);
  });

  it('array length mismatch', () => {
    expect(() => mean([1, 2], [3])).toThrow();
  });
});
