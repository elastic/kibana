/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { cos } = require('../../src/functions/cos');

describe('Cosine', () => {
  it('numbers', () => {
    expect(cos(0)).toEqual(1);
    expect(cos(1.5707963267948966)).toEqual(6.123233995736766e-17);
  });

  it('arrays', () => {
    expect(cos([0, 1.5707963267948966])).toEqual([1, 6.123233995736766e-17]);
  });
});
