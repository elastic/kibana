/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { floor } = require('../../src/functions/floor');

describe('Floor', () => {
  it('numbers', () => {
    expect(floor(-10.5)).toEqual(-11);
    expect(floor(-10.1)).toEqual(-11);
    expect(floor(10.9)).toEqual(10);
  });

  it('arrays', () => {
    expect(floor([-10.5, -20.9, -30.1, -40.2])).toEqual([-11, -21, -31, -41]);
    expect(floor([2.9, 5.1, 3.5, 4.3])).toEqual([2, 5, 3, 4]);
  });
});
