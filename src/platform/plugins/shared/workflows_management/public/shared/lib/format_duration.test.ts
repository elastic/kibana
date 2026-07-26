/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatDuration } from './format_duration';

describe('formatDuration', () => {
  describe('single units', () => {
    it.each([
      [500, '500ms'],
      [1000, '1s '],
      [60000, '1m '],
      [3600000, '1h '],
      [86400000, '1d '],
      [604800000, '1w '],
    ])('formats %d ms as "%s"', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe('compound units', () => {
    it.each([
      [90000, '1m 30s '],
      [5400000, '1h 30m '],
      [90000000, '1d 1h '],
      [694800000, '1w 1d 1h '],
    ])('formats %d ms as "%s"', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe('milliseconds are hidden when larger units are present', () => {
    it('hides milliseconds when seconds are present', () => {
      expect(formatDuration(1500)).toBe('1s ');
    });

    it('hides milliseconds when minutes are present', () => {
      expect(formatDuration(60500)).toBe('1m ');
    });

    it('hides milliseconds when hours are present', () => {
      expect(formatDuration(3600500)).toBe('1h ');
    });
  });

  describe('milliseconds are shown when no larger units exist', () => {
    it('shows milliseconds for values under 1000', () => {
      expect(formatDuration(1)).toBe('1ms');
      expect(formatDuration(999)).toBe('999ms');
    });
  });

  describe('boundary conditions', () => {
    it('returns empty string for 0 ms', () => {
      expect(formatDuration(0)).toBe('');
    });

    it('formats exactly one week', () => {
      expect(formatDuration(604800000)).toBe('1w ');
    });

    it('formats multiple weeks with remaining days', () => {
      // 2 weeks + 3 days = 2*604800000 + 3*86400000 = 1468800000
      expect(formatDuration(1468800000)).toBe('2w 3d ');
    });

    it('formats all units together', () => {
      // 1w + 2d + 3h + 4m + 5s = 604800000 + 172800000 + 10800000 + 240000 + 5000 = 788645000
      expect(formatDuration(788645000)).toBe('1w 2d 3h 4m 5s ');
    });
  });

  describe('edge cases', () => {
    it('handles exactly 999 ms', () => {
      expect(formatDuration(999)).toBe('999ms');
    });

    it('handles exactly 1000 ms as 1s', () => {
      expect(formatDuration(1000)).toBe('1s ');
    });

    it('handles exactly 59999 ms (59s, ms hidden by seconds)', () => {
      expect(formatDuration(59999)).toBe('59s ');
    });

    it('handles large durations', () => {
      // 10 weeks
      expect(formatDuration(10 * 604800000)).toBe('10w ');
    });
  });
});
