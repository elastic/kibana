/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { fix } = require('../../src/functions/fix');

describe('Fix', () => {
  it('numbers', () => {
    expect(fix(-10.5)).toEqual(-10);
    expect(fix(-10.1)).toEqual(-10);
    expect(fix(10.9)).toEqual(10);
  });

  it('arrays', () => {
    expect(fix([-10.5, -20.9, -30.1, -40.2])).toEqual([-10, -20, -30, -40]);
    expect(fix([2.9, 5.1, 3.5, 4.3])).toEqual([2, 5, 3, 4]);
  });
});
