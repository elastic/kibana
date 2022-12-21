/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { cube } = require('../../src/functions/cube');

describe('Cube', () => {
  it('numbers', () => {
    expect(cube(3)).toEqual(27);
    expect(cube(-1)).toEqual(-1);
  });

  it('arrays', () => {
    expect(cube([3, 4, 5])).toEqual([27, 64, 125]);
    expect(cube([1, 2, 10])).toEqual([1, 8, 1000]);
  });
});
