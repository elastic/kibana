/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectNumericLeaves, collectStringLeaves, isPlainObject } from './leaf_fields';

describe('leaf collectors', () => {
  describe('collectNumericLeaves', () => {
    it('flattens nested numeric leaves to dotted paths', () => {
      expect(
        collectNumericLeaves({ system: { cpu: { total: { norm: { pct: 0.5 } }, cores: 8 } } })
      ).toEqual({
        'system.cpu.total.norm.pct': 0.5,
        'system.cpu.cores': 8,
      });
    });

    it('reads already-flattened dotted keys', () => {
      expect(collectNumericLeaves({ 'system.cpu.total.norm.pct': 0.25 })).toEqual({
        'system.cpu.total.norm.pct': 0.25,
      });
    });

    it('skips @timestamp and non-finite/non-numeric values', () => {
      expect(
        collectNumericLeaves({
          '@timestamp': 1700000000000,
          a: NaN,
          b: Infinity,
          c: '5',
          d: 3,
        })
      ).toEqual({ d: 3 });
    });
  });

  describe('collectStringLeaves', () => {
    it('flattens nested string leaves and unwraps keyword arrays to their first element', () => {
      expect(
        collectStringLeaves({
          host: { name: 'box-a' },
          tags: ['only'],
          numbers: [1, 2],
          multi: ['a', 'b'],
        })
      ).toEqual({
        'host.name': 'box-a',
        tags: 'only',
        multi: 'a',
      });
    });

    it('skips @timestamp', () => {
      expect(collectStringLeaves({ '@timestamp': '2024-01-01T00:00:00.000Z', a: 'x' })).toEqual({
        a: 'x',
      });
    });
  });

  describe('isPlainObject', () => {
    it('is true only for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject('x')).toBe(false);
    });
  });
});
