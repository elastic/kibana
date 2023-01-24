/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { multiply } = require('../../src/functions/multiply');

describe('Multiply', () => {
  it('number, number', () => {
    expect(multiply(10, 2)).toEqual(20);
    expect(multiply(0.1, 0.2)).toEqual(0.1 * 0.2);
  });

  it('array, number', () => {
    expect(multiply([10, 20, 30, 40], 10)).toEqual([100, 200, 300, 400]);
  });

  it('number, array', () => {
    expect(multiply(10, [1, 2, 5, 10])).toEqual([10, 20, 50, 100]);
  });

  it('array, array', () => {
    expect(multiply([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([11, 96, 180, 288]);
  });

  it('array length mismatch', () => {
    expect(() => multiply([1, 2], [3])).toThrow('Array length mismatch');
  });
});
