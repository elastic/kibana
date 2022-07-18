/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { tan } = require('../../src/functions/tan');

describe('Tangent', () => {
  it('numbers', () => {
    expect(tan(0)).toEqual(0);
    expect(tan(1)).toEqual(1.5574077246549023);
  });

  it('arrays', () => {
    expect(tan([0, 1])).toEqual([0, 1.5574077246549023]);
  });
});
