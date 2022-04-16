/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { mod } = require('../../src/functions/mod');

describe('Mod', () => {
  it('number, number', () => {
    expect(mod(13, 8)).toEqual(5);
    expect(mod(0.1, 0.02)).toEqual(0.1 % 0.02);
  });

  it('array, number', () => {
    expect(mod([13, 26, 34, 42], 10)).toEqual([3, 6, 4, 2]);
  });

  it('number, array', () => {
    expect(mod(10, [3, 7, 2, 4])).toEqual([1, 3, 0, 2]);
  });

  it('array, array', () => {
    expect(mod([11, 48, 60, 72], [4, 13, 9, 5])).toEqual([3, 9, 6, 2]);
  });

  it('array length mismatch', () => {
    expect(() => mod([1, 2], [3])).toThrow('Array length mismatch');
  });
});
