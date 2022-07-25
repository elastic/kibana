/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { degtorad } = require('../../src/functions/degtorad');

describe('Degrees to Radians', () => {
  it('numbers', () => {
    expect(degtorad(0)).toEqual(0);
    expect(degtorad(90)).toEqual(1.5707963267948966);
  });

  it('arrays', () => {
    expect(degtorad([0, 90, 180, 360])).toEqual([
      0, 1.5707963267948966, 3.141592653589793, 6.283185307179586,
    ]);
  });
});
