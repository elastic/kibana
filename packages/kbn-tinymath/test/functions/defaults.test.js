/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { defaults } = require('../../src/functions/defaults');

describe('Defaults', () => {
  it('number, number', () => {
    expect(defaults(10, 2)).toEqual(10);
  });

  it('null, number', () => {
    expect(defaults(null, 2)).toEqual(2);
  });

  it('number, null', () => {
    expect(defaults(2, null)).toEqual(2);
  });

  it('array, number', () => {
    expect(defaults([10, 20, 30, 40], 10)).toEqual([10, 20, 30, 40]);
  });

  it('arrays with null, number', () => {
    expect(defaults([null, 20, 30, null], 10)).toEqual([10, 20, 30, 10]);
  });

  it('empty array, number', () => {
    expect(defaults([], 10)).toEqual([]);
  });

  it('skips number validation', () => {
    expect(defaults).toHaveProperty('skipNumberValidation', true);
  });
});
