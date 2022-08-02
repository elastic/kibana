/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { log10 } = require('../../src/functions/log10');

describe('Log10', () => {
  it('numbers', () => {
    expect(log10(1)).toEqual(Math.log(1) / Math.log(10));
    expect(log10(3)).toEqual(Math.log(3) / Math.log(10));
    expect(log10(11)).toEqual(Math.log(11) / Math.log(10));
    expect(log10(80)).toEqual(1.9030899869919433);
  });

  it('arrays', () => {
    expect(log10([3, 4, 5], 3)).toEqual([
      Math.log(3) / Math.log(10),
      Math.log(4) / Math.log(10),
      Math.log(5) / Math.log(10),
    ]);
    expect(log10([1, 2, 10], 10)).toEqual([
      Math.log(1) / Math.log(10),
      Math.log(2) / Math.log(10),
      Math.log(10) / Math.log(10),
    ]);
  });

  it('number less than 1', () => {
    expect(() => log10(-1)).toThrow('Must be greater than 0');
  });
});
