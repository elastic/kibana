/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { abs } = require('../../src/functions/abs');

describe('Abs', () => {
  it('numbers', () => {
    expect(abs(-10)).toEqual(10);
    expect(abs(10)).toEqual(10);
  });

  it('arrays', () => {
    expect(abs([-1])).toEqual([1]);
    expect(abs([-10, -20, -30, -40])).toEqual([10, 20, 30, 40]);
    expect(abs([-13, 30, -90, 200])).toEqual([13, 30, 90, 200]);
  });
});
