/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { pow } = require('../../src/functions/pow');

describe('Pow', () => {
  it('numbers', () => {
    expect(pow(3, 2)).toEqual(9);
    expect(pow(-1, -1)).toEqual(-1);
    expect(pow(5, 0)).toEqual(1);
  });

  it('arrays', () => {
    expect(pow([3, 4, 5], 3)).toEqual([Math.pow(3, 3), Math.pow(4, 3), Math.pow(5, 3)]);
    expect(pow([1, 2, 10], 10)).toEqual([Math.pow(1, 10), Math.pow(2, 10), Math.pow(10, 10)]);
  });

  it('missing exponent', () => {
    expect(() => pow(1)).toThrow('Missing exponent');
  });
});
