/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { size } = require('../../src/functions/size');

describe('Size (also Count)', () => {
  it('array', () => {
    expect(size([])).toEqual(0);
    expect(size([10, 20, 30, 40])).toEqual(4);
  });

  it('not an array', () => {
    expect(() => size(null)).toThrow('Must pass an array');
    expect(() => size(undefined)).toThrow('Must pass an array');
    expect(() => size('string')).toThrow('Must pass an array');
    expect(() => size(10)).toThrow('Must pass an array');
    expect(() => size(true)).toThrow('Must pass an array');
    expect(() => size({})).toThrow('Must pass an array');
    expect(() => size(function () {})).toThrow('Must pass an array');
  });

  it('skips number validation', () => {
    expect(size).toHaveProperty('skipNumberValidation', true);
  });
});
