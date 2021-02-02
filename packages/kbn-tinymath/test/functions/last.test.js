/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { last } = require('../../src/functions/last.js');

describe('Last', () => {
  it('numbers', () => {
    expect(last(-10)).toEqual(-10);
    expect(last(10)).toEqual(10);
  });

  it('arrays', () => {
    expect(last([])).toEqual(undefined);
    expect(last([-1])).toEqual(-1);
    expect(last([-10, -20, -30, -40])).toEqual(-40);
    expect(last([-13, 30, -90, 200])).toEqual(200);
  });

  it('skips number validation', () => {
    expect(last).toHaveProperty('skipNumberValidation', true);
  });
});
