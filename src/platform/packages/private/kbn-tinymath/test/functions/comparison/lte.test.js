/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { lte } = require('../../../src/functions/comparison/lte');

describe('Lte', () => {
  it('missing args', () => {
    expect(() => lte()).toThrow();
    expect(() => lte(-10)).toThrow();
    expect(() => lte([])).toThrow();
  });

  it('empty arrays', () => {
    expect(lte([], [])).toBeTruthy();
  });

  describe('eq values', () => {
    it('numbers', () => {
      expect(lte(-10, -10)).toBeTruthy();
      expect(lte(10, 10)).toBeTruthy();
      expect(lte(0, 0)).toBeTruthy();
    });

    it('arrays', () => {
      expect(lte([-1], -1)).toBeTruthy();
      expect(lte([-1], [-1])).toBeTruthy();
      expect(lte([-1, -1], -1)).toBeTruthy();
      expect(lte([-1, -1], [-1, -1])).toBeTruthy();
    });
  });

  describe('lt values', () => {
    it('numbers', () => {
      expect(lte(-10, -2)).toBeTruthy();
      expect(lte(10, 20)).toBeTruthy();
      expect(lte(0, 1)).toBeTruthy();
    });

    it('arrays', () => {
      // Should pass
      expect(lte([-1], 0)).toBeTruthy();
      expect(lte([-1], [0])).toBeTruthy();
      expect(lte([-1, -1], 0)).toBeTruthy();
      expect(lte([-1, -1], [0, 0])).toBeTruthy();

      // Should not pass
      expect(lte([-1], -2)).toBeFalsy();
      expect(lte([-1], [-2])).toBeFalsy();
      expect(lte([-1, -1], -2)).toBeFalsy();
      expect(lte([-1, -1], [-2, -2])).toBeFalsy();
      expect(lte([-1, -1], [-2, 2])).toBeFalsy();
    });
  });
});
