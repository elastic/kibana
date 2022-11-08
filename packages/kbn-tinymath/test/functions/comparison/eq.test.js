/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { eq } = require('../../../src/functions/comparison/eq');

describe('Eq', () => {
  it('numbers', () => {
    expect(eq(-10, -10)).toBeTruthy();
    expect(eq(10, 10)).toBeTruthy();
    expect(eq(0, 0)).toBeTruthy();
  });

  it('arrays', () => {
    // Should pass
    expect(eq([-1], -1)).toBeTruthy();
    expect(eq([-1], [-1])).toBeTruthy();
    expect(eq([-1, -1], -1)).toBeTruthy();
    expect(eq([-1, -1], [-1, -1])).toBeTruthy();

    // Should not pass
    expect(eq([-1], 0)).toBeFalsy();
    expect(eq([-1], [0])).toBeFalsy();
    expect(eq([-1, -1], 0)).toBeFalsy();
    expect(eq([-1, -1], [0, 0])).toBeFalsy();
    expect(eq([-1, -1], [-1, 0])).toBeFalsy();
  });

  it('missing args', () => {
    expect(() => eq()).toThrow();
    expect(() => eq(-10)).toThrow();
    expect(() => eq([])).toThrow();
  });

  it('empty arrays', () => {
    expect(eq([], [])).toBeTruthy();
  });
});
