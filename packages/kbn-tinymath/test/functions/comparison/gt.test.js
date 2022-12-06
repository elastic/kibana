/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { gt } = require('../../../src/functions/comparison/gt');

describe('Gt', () => {
  it('missing args', () => {
    expect(() => gt()).toThrow();
    expect(() => gt(-10)).toThrow();
    expect(() => gt([])).toThrow();
  });

  it('empty arrays', () => {
    expect(gt([], [])).toBeTruthy();
  });

  it('numbers', () => {
    expect(gt(-10, -20)).toBeTruthy();
    expect(gt(10, 0)).toBeTruthy();
    expect(gt(0, -1)).toBeTruthy();
  });

  it('arrays', () => {
    // Should pass
    expect(gt([-1], -2)).toBeTruthy();
    expect(gt([-1], [-2])).toBeTruthy();
    expect(gt([-1, -1], -2)).toBeTruthy();
    expect(gt([-1, -1], [-2, -2])).toBeTruthy();

    // Should not pass
    expect(gt([-1], 2)).toBeFalsy();
    expect(gt([-1], [2])).toBeFalsy();
    expect(gt([-1, -1], 2)).toBeFalsy();
    expect(gt([-1, -1], [2, 2])).toBeFalsy();
    expect(gt([-1, -1], [-2, 2])).toBeFalsy();
  });
});
