/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { square } = require('../../src/functions/square');

describe('Square', () => {
  it('numbers', () => {
    expect(square(3)).toEqual(9);
    expect(square(-1)).toEqual(1);
  });

  it('arrays', () => {
    expect(square([3, 4, 5])).toEqual([9, 16, 25]);
    expect(square([1, 2, 10])).toEqual([1, 4, 100]);
  });
});
