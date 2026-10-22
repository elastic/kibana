/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { calculateRoundedBounds, getRoundedAbsoluteTimeRange } from './rounded_bounds';

describe('rounded bounds', () => {
  const now = new Date('2026-10-22T12:34:56.789Z');

  beforeAll(() => {
    moment.tz.setDefault('UTC');
  });

  afterAll(() => {
    moment.tz.setDefault('Browser');
  });

  describe('calculateRoundedBounds', () => {
    test('truncates "now" to the last whole second', () => {
      const { min, max } = calculateRoundedBounds({ from: 'now-15m', to: 'now' }, now);
      expect(min?.toISOString()).toBe('2026-10-22T12:19:56.000Z');
      expect(max?.toISOString()).toBe('2026-10-22T12:34:56.000Z');
    });

    test('ends rounded-up relative bounds on the last whole second', () => {
      const { min, max } = calculateRoundedBounds({ from: 'now/d', to: 'now/d' }, now);
      expect(min?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
      expect(max?.toISOString()).toBe('2026-10-22T23:59:59.000Z');
    });

    test('keeps milliseconds when a bound uses the ms unit', () => {
      const { min, max } = calculateRoundedBounds({ from: 'now-500ms', to: 'now/d' }, now);
      expect(min?.toISOString()).toBe('2026-10-22T12:34:56.289Z');
      expect(max?.toISOString()).toBe('2026-10-22T23:59:59.999Z');
    });

    test('keeps millisecond precision on absolute bounds', () => {
      const { min, max } = calculateRoundedBounds(
        { from: '2026-10-21T01:02:03.456Z', to: '2026-10-21T04:05:06.789Z' },
        now
      );
      expect(min?.toISOString()).toBe('2026-10-21T01:02:03.456Z');
      expect(max?.toISOString()).toBe('2026-10-21T04:05:06.789Z');
    });

    test('returns undefined bounds for empty input', () => {
      const { min, max } = calculateRoundedBounds({ from: '', to: '' }, now);
      expect(min).toBeUndefined();
      expect(max).toBeUndefined();
    });
  });

  describe('getRoundedAbsoluteTimeRange', () => {
    test('converts relative bounds to whole-second ISO strings', () => {
      expect(getRoundedAbsoluteTimeRange({ from: 'now-15m', to: 'now/d' }, now)).toEqual({
        from: '2026-10-22T12:19:56.000Z',
        to: '2026-10-22T23:59:59.000Z',
      });
    });

    test('falls back to the input when bounds cannot be resolved', () => {
      expect(getRoundedAbsoluteTimeRange({ from: '', to: 'now' }, now)).toEqual({
        from: '',
        to: '2026-10-22T12:34:56.000Z',
      });
    });
  });
});
