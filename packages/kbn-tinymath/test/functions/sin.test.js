/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { sin } = require('../../src/functions/sin');

describe('Sine', () => {
  it('numbers', () => {
    expect(sin(0)).toEqual(0);
    expect(sin(1.5707963267948966)).toEqual(1);
  });

  it('arrays', () => {
    expect(sin([0, 1.5707963267948966])).toEqual([0, 1]);
  });
});
