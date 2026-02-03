/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getReadableFrequency, getReadableInterval } from './rrule_logging_utils';

describe('rrule_logging_utils', () => {
  describe('getReadableFrequency', () => {
    it('should return correct frequency for valid enum values', () => {
      expect(getReadableFrequency(0)).toBe('YEARLY');
      expect(getReadableFrequency(1)).toBe('MONTHLY');
      expect(getReadableFrequency(2)).toBe('WEEKLY');
      expect(getReadableFrequency(3)).toBe('DAILY');
      expect(getReadableFrequency(4)).toBe('HOURLY');
      expect(getReadableFrequency(5)).toBe('MINUTELY');
      expect(getReadableFrequency(6)).toBe('SECONDLY');
    });

    it('should return fallback format for unknown enum values', () => {
      expect(getReadableFrequency(99)).toBe('FREQ_99');
      expect(getReadableFrequency(-1)).toBe('FREQ_-1');
      expect(getReadableFrequency(7)).toBe('FREQ_7');
    });
  });

  describe('getReadableInterval', () => {
    it('should return singular form for interval of 1', () => {
      expect(getReadableInterval(0, 1)).toBe('year');
      expect(getReadableInterval(1, 1)).toBe('month');
      expect(getReadableInterval(2, 1)).toBe('week');
      expect(getReadableInterval(3, 1)).toBe('day');
      expect(getReadableInterval(4, 1)).toBe('hour');
      expect(getReadableInterval(5, 1)).toBe('minute');
      expect(getReadableInterval(6, 1)).toBe('second');
    });

    it('should return plural form for interval greater than 1', () => {
      expect(getReadableInterval(0, 2)).toBe('years');
      expect(getReadableInterval(1, 3)).toBe('months');
      expect(getReadableInterval(2, 4)).toBe('weeks');
      expect(getReadableInterval(3, 5)).toBe('days');
      expect(getReadableInterval(4, 6)).toBe('hours');
      expect(getReadableInterval(5, 7)).toBe('minutes');
      expect(getReadableInterval(6, 8)).toBe('seconds');
    });

    it('should return fallback for unknown frequency', () => {
      expect(getReadableInterval(99, 1)).toBe('99_interval');
      expect(getReadableInterval(99, 2)).toBe('99_intervals');
    });
  });

  describe('Integration tests', () => {
    it('should work together for common RRule patterns', () => {
      // Daily pattern
      const dailyFreq = getReadableFrequency(3);
      const dailyInterval = getReadableInterval(3, 1);
      expect(dailyFreq).toBe('DAILY');
      expect(dailyInterval).toBe('day');

      // Weekly pattern
      const weeklyFreq = getReadableFrequency(2);
      const weeklyInterval = getReadableInterval(2, 2);
      expect(weeklyFreq).toBe('WEEKLY');
      expect(weeklyInterval).toBe('weeks');

      // Monthly pattern
      const monthlyFreq = getReadableFrequency(1);
      const monthlyInterval = getReadableInterval(1, 3);
      expect(monthlyFreq).toBe('MONTHLY');
      expect(monthlyInterval).toBe('months');
    });

    it('should handle all frequency types correctly', () => {
      const frequencies = [0, 1, 2, 3, 4, 5, 6];
      const expectedFreqs = [
        'YEARLY',
        'MONTHLY',
        'WEEKLY',
        'DAILY',
        'HOURLY',
        'MINUTELY',
        'SECONDLY',
      ];
      const expectedIntervals = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

      frequencies.forEach((freq, index) => {
        expect(getReadableFrequency(freq)).toBe(expectedFreqs[index]);
        expect(getReadableInterval(freq, 1)).toBe(expectedIntervals[index]);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined/null inputs gracefully', () => {
      // These should not throw errors
      expect(() => getReadableFrequency(undefined as any)).not.toThrow();
      expect(() => getReadableInterval(undefined as any, 1)).not.toThrow();
      expect(() => getReadableInterval(3, undefined as any)).not.toThrow();
    });

    it('should handle non-numeric inputs', () => {
      // String '3' gets coerced to number 3, which is DAILY
      expect(getReadableFrequency('3' as any)).toBe('DAILY');
      expect(getReadableInterval('3' as any, 1)).toBe('day');
    });

    it('should handle very large numbers', () => {
      expect(getReadableFrequency(Number.MAX_SAFE_INTEGER)).toBe('FREQ_9007199254740991');
      expect(getReadableInterval(3, Number.MAX_SAFE_INTEGER)).toBe('days');
    });
  });

  describe('Pluralize function', () => {
    it('should handle singular and plural correctly', () => {
      // Test the pluralize function behavior
      expect(getReadableInterval(3, 1)).toBe('day');
      expect(getReadableInterval(3, 2)).toBe('days');
      expect(getReadableInterval(3, 0)).toBe('days');
      expect(getReadableInterval(3, -1)).toBe('days');
    });

    it('should handle different frequency types', () => {
      expect(getReadableInterval(0, 1)).toBe('year');
      expect(getReadableInterval(0, 2)).toBe('years');
      expect(getReadableInterval(1, 1)).toBe('month');
      expect(getReadableInterval(1, 2)).toBe('months');
      expect(getReadableInterval(2, 1)).toBe('week');
      expect(getReadableInterval(2, 2)).toBe('weeks');
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should format common business schedules correctly', () => {
      // Every day at 9 AM
      const dailyFreq = getReadableFrequency(3);
      const dailyInterval = getReadableInterval(3, 1);
      expect(dailyFreq).toBe('DAILY');
      expect(dailyInterval).toBe('day');

      // Every 2 weeks
      const weeklyFreq = getReadableFrequency(2);
      const weeklyInterval = getReadableInterval(2, 2);
      expect(weeklyFreq).toBe('WEEKLY');
      expect(weeklyInterval).toBe('weeks');

      // Every 3 months
      const monthlyFreq = getReadableFrequency(1);
      const monthlyInterval = getReadableInterval(1, 3);
      expect(monthlyFreq).toBe('MONTHLY');
      expect(monthlyInterval).toBe('months');

      // Every 6 hours
      const hourlyFreq = getReadableFrequency(4);
      const hourlyInterval = getReadableInterval(4, 6);
      expect(hourlyFreq).toBe('HOURLY');
      expect(hourlyInterval).toBe('hours');
    });

    it('should handle complex RRule patterns', () => {
      // Every 15 minutes
      const minutelyFreq = getReadableFrequency(5);
      const minutelyInterval = getReadableInterval(5, 15);
      expect(minutelyFreq).toBe('MINUTELY');
      expect(minutelyInterval).toBe('minutes');

      // Every 30 seconds
      const secondlyFreq = getReadableFrequency(6);
      const secondlyInterval = getReadableInterval(6, 30);
      expect(secondlyFreq).toBe('SECONDLY');
      expect(secondlyInterval).toBe('seconds');
    });
  });
});
