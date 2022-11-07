/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { gte } = require('../../../src/functions/comparison/gte');

describe('Gte', () => {
  it('missing args', () => {
    expect(() => gte()).toThrow();
    expect(() => gte(-10)).toThrow();
    expect(() => gte([])).toThrow();
  });

  it('empty arrays', () => {
    expect(gte([], [])).toBeTruthy();
  });

  describe('eq values', () => {
    it('numbers', () => {
      expect(gte(-10, -10)).toBeTruthy();
      expect(gte(10, 10)).toBeTruthy();
      expect(gte(0, 0)).toBeTruthy();
    });

    it('arrays', () => {
      expect(gte([-1], -1)).toBeTruthy();
      expect(gte([-1], [-1])).toBeTruthy();
      expect(gte([-1, -1], -1)).toBeTruthy();
      expect(gte([-1, -1], [-1, -1])).toBeTruthy();
    });
  });

  describe('gt values', () => {
    it('numbers', () => {
      expect(gte(-10, -20)).toBeTruthy();
      expect(gte(10, 0)).toBeTruthy();
      expect(gte(0, -1)).toBeTruthy();
    });

    it('arrays', () => {
      // Should pass
      expect(gte([-1], -2)).toBeTruthy();
      expect(gte([-1], [-2])).toBeTruthy();
      expect(gte([-1, -1], -2)).toBeTruthy();
      expect(gte([-1, -1], [-2, -2])).toBeTruthy();

      // Should not pass
      expect(gte([-1], 2)).toBeFalsy();
      expect(gte([-1], [2])).toBeFalsy();
      expect(gte([-1, -1], 2)).toBeFalsy();
      expect(gte([-1, -1], [2, 2])).toBeFalsy();
      expect(gte([-1, -1], [-2, 2])).toBeFalsy();
    });
  });
});
