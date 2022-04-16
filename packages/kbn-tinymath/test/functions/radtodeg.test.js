/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { radtodeg } = require('../../src/functions/radtodeg');

describe('Radians to Degrees', () => {
  it('numbers', () => {
    expect(radtodeg(0)).toEqual(0);
    expect(radtodeg(1.5707963267948966)).toEqual(90);
  });

  it('arrays', () => {
    expect(radtodeg([0, 1.5707963267948966, 3.141592653589793, 6.283185307179586])).toEqual([
      0, 90, 180, 360,
    ]);
  });
});
