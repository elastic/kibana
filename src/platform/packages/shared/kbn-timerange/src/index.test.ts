/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDateRange,
  getDateISORange,
  getTimeDifferenceInSeconds,
  getOffsetFromNowInSeconds,
  type TimeRange,
} from '.';

describe('@kbn/timerange', () => {
  describe('getTimeDifferenceInSeconds', () => {
    describe('with timestamp objects (legacy API)', () => {
      it('should calculate difference correctly for 1 hour', () => {
        const input = {
          startDate: new Date('2023-01-01T00:00:00.000Z').getTime(),
          endDate: new Date('2023-01-01T01:00:00.000Z').getTime(),
        };
        expect(getTimeDifferenceInSeconds(input)).toBe(3600);
      });

      it('should return NaN for invalid start date', () => {
        const input = {
          startDate: NaN,
          endDate: new Date('2023-01-01T01:00:00.000Z').getTime(),
        };
        expect(getTimeDifferenceInSeconds(input)).toBeNaN();
      });

      it('should return NaN for invalid end date', () => {
        const input = {
          startDate: new Date('2023-01-01T00:00:00.000Z').getTime(),
          endDate: NaN,
        };
        expect(getTimeDifferenceInSeconds(input)).toBeNaN();
      });

      it('should return NaN when start date is after end date', () => {
        const input = {
          startDate: new Date('2023-01-01T01:00:00.000Z').getTime(),
          endDate: new Date('2023-01-01T00:00:00.000Z').getTime(),
        };
        expect(getTimeDifferenceInSeconds(input)).toBeNaN();
      });

      it('should handle Unix epoch (0) as valid timestamp', () => {
        const input = {
          startDate: 0, // Unix epoch - January 1, 1970
          endDate: 3600000, // 1 hour later
        };
        expect(getTimeDifferenceInSeconds(input)).toBe(3600);
      });
    });

    describe('with TimeRange objects (new API)', () => {
      it('should calculate correct seconds for a 1-hour range using TimeRange interface', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-01T01:00:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(3600);
      });

      it('should calculate correct seconds for a 24-hour range', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-02T00:00:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(86400);
      });

      it('should handle sub-second differences correctly', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-01T00:00:00.500Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(1); // Rounded up
      });

      it('should handle same from and to times', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-01T00:00:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(0);
      });

      it('should calculate correct seconds for a 7-day range', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-08T00:00:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(604800); // 7 * 24 * 60 * 60
      });

      it('should calculate correct seconds for a 15-minute range', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-01T00:15:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(900); // 15 * 60
      });

      it('should handle invalid date strings gracefully', () => {
        const timeRange: TimeRange = {
          from: 'invalid-date',
          to: '2023-01-01T00:15:00.000Z',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBeNaN();
      });

      it('should handle both invalid date strings', () => {
        const timeRange: TimeRange = {
          from: 'invalid-date',
          to: 'also-invalid',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBeNaN();
      });

      it('should handle mode property in TimeRange', () => {
        const timeRange: TimeRange = {
          from: '2023-01-01T00:00:00.000Z',
          to: '2023-01-01T01:00:00.000Z',
          mode: 'absolute',
        };
        expect(getTimeDifferenceInSeconds(timeRange)).toBe(3600);
      });
    });
  });

  describe('getDateRange', () => {
    it('should return timestamps for valid date range', () => {
      const result = getDateRange({
        from: '2023-01-01T00:00:00.000Z',
        to: '2023-01-01T01:00:00.000Z',
      });
      expect(typeof result.startDate).toBe('number');
      expect(typeof result.endDate).toBe('number');
      expect(result.endDate - result.startDate).toBe(3600000); // 1 hour in milliseconds
    });

    it('should handle relative dates like "now-1h"', () => {
      const result = getDateRange({
        from: 'now-1h',
        to: 'now',
      });
      expect(typeof result.startDate).toBe('number');
      expect(typeof result.endDate).toBe('number');
      expect(result.endDate).toBeGreaterThan(result.startDate);
    });

    it('should throw error for invalid date range', () => {
      expect(() => {
        getDateRange({
          from: 'invalid-date',
          to: 'also-invalid',
        });
      }).toThrow('Invalid Dates');
    });
  });

  describe('getDateISORange', () => {
    it('should return ISO strings for valid date range', () => {
      const result = getDateISORange({
        from: '2023-01-01T00:00:00.000Z',
        to: '2023-01-01T01:00:00.000Z',
      });
      expect(typeof result.startDate).toBe('string');
      expect(typeof result.endDate).toBe('string');
      expect(new Date(result.startDate)).toBeInstanceOf(Date);
      expect(new Date(result.endDate)).toBeInstanceOf(Date);
    });

    it('should handle relative dates', () => {
      const result = getDateISORange({
        from: 'now-1h',
        to: 'now',
      });
      expect(typeof result.startDate).toBe('string');
      expect(typeof result.endDate).toBe('string');
      expect(new Date(result.endDate).getTime()).toBeGreaterThan(
        new Date(result.startDate).getTime()
      );
    });
  });

  describe('getOffsetFromNowInSeconds', () => {
    it('should return negative offset for past dates', () => {
      const pastDate = Date.now() - 3600000; // 1 hour ago
      const offset = getOffsetFromNowInSeconds(pastDate);
      expect(offset).toBeLessThan(0);
      expect(Math.abs(offset)).toBeCloseTo(3600, -1); // approximately 3600 seconds
    });

    it('should return positive offset for future dates', () => {
      const futureDate = Date.now() + 3600000; // 1 hour in future
      const offset = getOffsetFromNowInSeconds(futureDate);
      expect(offset).toBeGreaterThan(0);
      expect(Math.abs(offset)).toBeCloseTo(3600, -1); // approximately 3600 seconds
    });

    it('should return approximately zero for current time', () => {
      const now = Date.now();
      const offset = getOffsetFromNowInSeconds(now);
      expect(Math.abs(offset)).toBeLessThan(1); // Less than 1 second difference
    });
  });
});
