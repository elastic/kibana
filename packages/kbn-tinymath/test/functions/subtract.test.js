/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { subtract } = require('../../src/functions/subtract');

describe('Subtract', () => {
  it('number, number', () => {
    expect(subtract(10, 2)).toEqual(8);
    expect(subtract(0.1, 0.2)).toEqual(0.1 - 0.2);
  });

  it('array, number', () => {
    expect(subtract([10, 20, 30, 40], 10)).toEqual([0, 10, 20, 30]);
  });

  it('number, array', () => {
    expect(subtract(10, [1, 2, 5, 10])).toEqual([9, 8, 5, 0]);
  });

  it('array, array', () => {
    expect(subtract([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([10, 46, 57, 68]);
  });

  it('array length mismatch', () => {
    expect(() => subtract([1, 2], [3])).toThrow('Array length mismatch');
  });
});
