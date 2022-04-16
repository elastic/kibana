/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { exp } = require('../../src/functions/exp');

describe('Exp', () => {
  it('numbers', () => {
    expect(exp(3)).toEqual(Math.exp(3));
    expect(exp(0)).toEqual(Math.exp(0));
    expect(exp(5)).toEqual(Math.exp(5));
  });

  it('arrays', () => {
    expect(exp([3, 4, 5])).toEqual([Math.exp(3), Math.exp(4), Math.exp(5)]);
    expect(exp([1, 2, 10])).toEqual([Math.exp(1), Math.exp(2), Math.exp(10)]);
    expect(exp([10])).toEqual([Math.exp(10)]);
  });
});
