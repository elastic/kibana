/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { sqrt } = require('../../src/functions/sqrt');

describe('Sqrt', () => {
  it('numbers', () => {
    expect(sqrt(9)).toEqual(3);
    expect(sqrt(0)).toEqual(0);
    expect(sqrt(30)).toEqual(5.477225575051661);
  });

  it('arrays', () => {
    expect(sqrt([49, 64, 81])).toEqual([7, 8, 9]);
    expect(sqrt([1, 4, 100])).toEqual([1, 2, 10]);
  });

  it('Invalid negative number', () => {
    expect(() => sqrt(-1)).toThrow('Unable find the square root of a negative number');
  });
});
