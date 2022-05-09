/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { unique } = require('../../src/functions/unique');

describe('Unique', () => {
  it('numbers', () => {
    expect(unique(1)).toEqual(1);
    expect(unique(10000)).toEqual(1);
  });

  it('arrays', () => {
    expect(unique([])).toEqual(0);
    expect(unique([-10, -20, -30, -40])).toEqual(4);
    expect(unique([-13, 30, -90, 200])).toEqual(4);
    expect(unique([1, 2, 3, 4, 2, 2, 2, 3, 4, 2, 4, 5, 2, 1, 4, 2])).toEqual(5);
  });

  it('skips number validation', () => {
    expect(unique).toHaveProperty('skipNumberValidation', true);
  });
});
