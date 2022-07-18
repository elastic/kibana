/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { ceil } = require('../../src/functions/ceil');

describe('Ceil', () => {
  it('numbers', () => {
    expect(ceil(-10.5)).toEqual(-10);
    expect(ceil(-10.1)).toEqual(-10);
    expect(ceil(10.9)).toEqual(11);
  });

  it('arrays', () => {
    expect(ceil([-10.5, -20.9, -30.1, -40.2])).toEqual([-10, -20, -30, -40]);
    expect(ceil([2.9, 5.1, 3.5, 4.3])).toEqual([3, 6, 4, 5]);
  });
});
