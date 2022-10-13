/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { log } = require('../../src/functions/log');

describe('Log', () => {
  it('numbers', () => {
    expect(log(1)).toEqual(Math.log(1));
    expect(log(3, 2)).toEqual(Math.log(3) / Math.log(2));
    expect(log(11, 3)).toEqual(Math.log(11) / Math.log(3));
    expect(log(42, 5)).toEqual(2.322344707681546);
  });

  it('arrays', () => {
    expect(log([3, 4, 5], 3)).toEqual([
      Math.log(3) / Math.log(3),
      Math.log(4) / Math.log(3),
      Math.log(5) / Math.log(3),
    ]);
    expect(log([1, 2, 10], 10)).toEqual([
      Math.log(1) / Math.log(10),
      Math.log(2) / Math.log(10),
      Math.log(10) / Math.log(10),
    ]);
  });

  it('number less than 1', () => {
    expect(() => log(-1)).toThrow('Must be greater than 0');
  });

  it('base out of range', () => {
    expect(() => log(1, -1)).toThrow('Base out of range');
  });
});
