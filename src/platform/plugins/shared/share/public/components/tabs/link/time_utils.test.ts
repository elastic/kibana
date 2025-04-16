/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertRelativeToAbsoluteDate,
  getRelativeValueAndUnit,
  isTimeRangeAbsoluteTime,
} from './time_utils';

describe('Time Utils', () => {
  describe('getRelativeValueAndUnit', () => {
    it('returns correct value and unit', async () => {
      const date = 'now-1m';
      const date2 = 'now+1h';

      const result = getRelativeValueAndUnit(date);
      expect(result).toEqual({ value: -1, unit: 'minute' });
      const result2 = getRelativeValueAndUnit(date2);
      expect(result2).toEqual({ value: 1, unit: 'hour' });
    });

    it('returns undefined for invalid date', async () => {
      const date = 'invalid-date';

      const result = getRelativeValueAndUnit(date);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty date', async () => {
      const date = '';

      const result = getRelativeValueAndUnit(date);
      expect(result).toBeUndefined();
    });

    it('returns undefined for date without relative time', async () => {
      const date = '2023-10-01T00:00:00Z';

      const result = getRelativeValueAndUnit(date);
      expect(result).toBeUndefined();
    });
  });

  describe('convertRelativeToAbsoluteDate', () => {
    it('returns absolute date for relative date', async () => {
      const date = 'now-1m';

      const result = convertRelativeToAbsoluteDate(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('returns absolute date for absolute date', async () => {
      const date = '2023-10-01T00:00:00Z';

      const result = convertRelativeToAbsoluteDate(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('returns undefined for invalid date', async () => {
      const date = 'invalid-date';

      const result = convertRelativeToAbsoluteDate(date);
      expect(result).toBeUndefined();
    });
  });

  describe('isTimeRangeAbsoluteTime', () => {
    it('returns true for absolute time range', async () => {
      const timeRange = { from: '2023-10-01T00:00:00Z', to: '2023-10-02T00:00:00Z' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(true);
    });

    it('returns false for time range with one relative date', async () => {
      const timeRange = { from: 'now-1m', to: '2023-10-02T00:00:00Z' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(false);
    });

    it('returns false for time range with both relative dates', async () => {
      const timeRange = { from: 'now-1m', to: 'now-2m' };

      const result = isTimeRangeAbsoluteTime(timeRange);
      expect(result).toBe(false);
    });
  });
});
