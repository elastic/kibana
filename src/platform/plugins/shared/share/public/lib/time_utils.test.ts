/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertRelativeTimeStringToAbsoluteTimeDate,
  convertRelativeTimeStringToAbsoluteTimeString,
  getRelativeTimeValueAndUnitFromTimeString,
  isTimeRangeAbsoluteTime,
} from './time_utils';

describe('Time Utils', () => {
  describe('getRelativeTimeValueAndUnitFromTimeString', () => {
    it('returns correct value and unit', () => {
      const date = 'now-1m';
      const date2 = 'now+1h';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toEqual({ value: -1, unit: 'minute' });
      const result2 = getRelativeTimeValueAndUnitFromTimeString(date2);
      expect(result2).toEqual({ value: 1, unit: 'hour' });
    });

    it('returns undefined for invalid date', () => {
      const date = 'invalid-date';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty date', () => {
      const date = '';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toBeUndefined();
    });

    it('returns undefined for date without relative time', () => {
      const date = '2023-10-01T00:00:00Z';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toBeUndefined();
    });

    it('returns rounding unit if its valid', () => {
      const date = 'now-1m/h';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toEqual({ value: -1, unit: 'minute', roundingUnit: 'hour' });
    });

    it('returns undefined for invalid rounding unit', () => {
      const date = 'now-1m/invalid-unit';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toEqual({ value: -1, unit: 'minute', roundingUnit: undefined });
    });

    it('handles plain "now" with rounding unit for "Today" case', () => {
      const date = 'now/d';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toEqual({ value: 0, unit: 'second', roundingUnit: 'day' });
    });

    it('handles plain "now" without rounding unit', () => {
      const date = 'now';

      const result = getRelativeTimeValueAndUnitFromTimeString(date);
      expect(result).toEqual({ value: 0, unit: 'second', roundingUnit: undefined });
    });
  });

  describe('convertRelativeTimeStringToAbsoluteTimeDate', () => {
    it('returns absolute date for relative date', () => {
      const date = 'now-1m';

      const result = convertRelativeTimeStringToAbsoluteTimeDate(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('returns absolute date for absolute date', () => {
      const date = '2023-10-01T00:00:00Z';

      const result = convertRelativeTimeStringToAbsoluteTimeDate(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('returns undefined for invalid date', () => {
      const date = 'invalid-date';

      const result = convertRelativeTimeStringToAbsoluteTimeDate(date);
      expect(result).toBeUndefined();
    });

    it('handles roundUp option for "now/d" to get end of day', () => {
      const date = 'now/d';

      // Mock current time to a specific moment
      const mockDate = new Date('2026-01-30T15:30:00.000Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const resultStart = convertRelativeTimeStringToAbsoluteTimeDate(date);
      const resultEnd = convertRelativeTimeStringToAbsoluteTimeDate(date, { roundUp: true });

      // Verify that start and end are different (roundUp makes a difference)
      expect(resultStart).toBeInstanceOf(Date);
      expect(resultEnd).toBeInstanceOf(Date);
      expect(resultStart?.getTime()).not.toBe(resultEnd?.getTime());

      // End should be later than start
      expect(resultEnd!.getTime()).toBeGreaterThan(resultStart!.getTime());

      jest.useRealTimers();
    });

    it('handles roundUp option for "now" to get current time with ms precision', () => {
      const date = 'now';

      const mockDate = new Date('2026-01-30T15:30:45.123Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const resultNormal = convertRelativeTimeStringToAbsoluteTimeDate(date);
      const resultRoundUp = convertRelativeTimeStringToAbsoluteTimeDate(date, { roundUp: true });

      // Both should return the same for plain "now" since there's no unit to round
      expect(resultNormal?.getTime()).toBe(mockDate.getTime());
      expect(resultRoundUp?.getTime()).toBe(mockDate.getTime());

      jest.useRealTimers();
    });
  });

  describe('isTimeRangeAbsoluteTime', () => {
    it('returns true for absolute time range', () => {
      const timeRange = { from: '2023-10-01T00:00:00Z', to: '2023-10-02T00:00:00Z' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(true);
    });

    it('returns false for time range with one relative date', () => {
      const timeRange = { from: 'now-1m', to: '2023-10-02T00:00:00Z' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(false);
    });

    it('returns false for time range with both relative dates', () => {
      const timeRange = { from: 'now-1m', to: 'now-2m' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(false);
    });
  });

  describe('convertRelativeTimeStringToAbsoluteTimeString', () => {
    it('returns absolute date string for relative date', () => {
      const date = 'now-1m';

      // Freeze current time to a fixed point
      const fixedNow = new Date('2025-04-16T19:14:54.027Z');
      jest.spyOn(Date, 'now').mockImplementation(() => fixedNow.getTime());

      const result = convertRelativeTimeStringToAbsoluteTimeString(date);

      expect(result).toBe('2025-04-16T19:13:54.027Z');

      // Restore Date.now()
      jest.restoreAllMocks();
    });

    it('returns absolute date string for absolute date', () => {
      const date = '2023-10-01T00:00:00.000Z';

      const result = convertRelativeTimeStringToAbsoluteTimeString(date);
      expect(result).toBe('2023-10-01T00:00:00.000Z');
    });

    it('returns original date string for invalid date', () => {
      const date = 'invalid-date';

      const result = convertRelativeTimeStringToAbsoluteTimeString(date);
      expect(result).toBe(date);
    });

    it('handles roundUp option for "now/d" to get end of day as ISO string', () => {
      const date = 'now/d';

      const mockDate = new Date('2026-01-30T15:30:00.000Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const resultStart = convertRelativeTimeStringToAbsoluteTimeString(date);
      const resultEnd = convertRelativeTimeStringToAbsoluteTimeString(date, { roundUp: true });

      // Verify both are valid ISO strings
      expect(resultStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(resultEnd).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify they are different and end is later than start
      expect(resultStart).not.toBe(resultEnd);
      expect(new Date(resultEnd!).getTime()).toBeGreaterThan(new Date(resultStart!).getTime());

      jest.useRealTimers();
    });
  });
});
