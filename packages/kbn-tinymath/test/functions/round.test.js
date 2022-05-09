/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { round } = require('../../src/functions/round');

describe('Round', () => {
  it('numbers', () => {
    expect(round(-10.51)).toEqual(-11);
    expect(round(-10.1, 2)).toEqual(-10.1);
    expect(round(10.93745987, 4)).toEqual(10.9375);
  });

  it('arrays', () => {
    expect(round([-10.51, -20.9, -30.1, -40.2])).toEqual([-11, -21, -30, -40]);
    expect(round([2.9234, 5.1234, 3.5234, 4.49234324], 2)).toEqual([2.92, 5.12, 3.52, 4.49]);
  });
});
