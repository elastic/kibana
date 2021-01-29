/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { cbrt } = require('../../src/functions/cbrt.js');

describe('Cbrt', () => {
  it('numbers', () => {
    expect(cbrt(27)).toEqual(3);
    expect(cbrt(-1)).toEqual(-1);
    expect(cbrt(94)).toEqual(4.546835943776344);
  });

  it('arrays', () => {
    expect(cbrt([27, 64, 125])).toEqual([3, 4, 5]);
    expect(cbrt([1, 8, 1000])).toEqual([1, 2, 10]);
  });
});
