/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { add } = require('../../src/functions/add');

describe('Add', () => {
  it('numbers', () => {
    expect(add(1)).toEqual(1);
    expect(add(10, 2, 5, 8)).toEqual(25);
    expect(add(0.1, 0.2, 0.4, 0.3)).toEqual(0.1 + 0.2 + 0.3 + 0.4);
  });

  it('arrays & numbers', () => {
    expect(add([10, 20, 30, 40], 10, 20, 30)).toEqual([70, 80, 90, 100]);
    expect(add(10, [10, 20, 30, 40], [1, 2, 3, 4], 22)).toEqual([43, 54, 65, 76]);
  });

  it('arrays', () => {
    expect(add([1, 2, 3, 4])).toEqual(10);
    expect(add([1, 2, 3, 4], [1, 2, 5, 10])).toEqual([2, 4, 8, 14]);
    expect(add([1, 2, 3, 4], [1, 2, 5, 10], [10, 20, 30, 40])).toEqual([12, 24, 38, 54]);
    expect(add([11, 48, 60, 72], [1, 2, 3, 4])).toEqual([12, 50, 63, 76]);
  });

  it('array length mismatch', () => {
    expect(() => add([1, 2], [3])).toThrow('Array length mismatch');
  });
});
