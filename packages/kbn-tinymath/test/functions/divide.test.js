/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { divide } = require('../../src/functions/divide');

describe('Divide', () => {
  it('number, number', () => {
    expect(divide(10, 2)).toEqual(5);
    expect(divide(0.1, 0.02)).toEqual(0.1 / 0.02);
  });

  it('array, number', () => {
    expect(divide([10, 20, 30, 40], 10)).toEqual([1, 2, 3, 4]);
  });

  it('number, array', () => {
    expect(divide(10, [1, 2, 5, 10])).toEqual([10, 5, 2, 1]);
  });

  it('array, array', () => {
    expect(divide([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([11, 24, 20, 18]);
  });

  it('array length mismatch', () => {
    expect(() => divide([1, 2], [3])).toThrow('Array length mismatch');
  });
});
