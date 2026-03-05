/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from './constants';
import type { TimeRange } from './types';
import {
  isHalfHourExact,
  toLocalPreciseString,
  roundToHalfHour,
  toUTCISOString,
  isValidTimeRange,
  getOptionDisplayLabel,
  getOptionShorthand,
  getOptionInputText,
} from './utils';

describe('toLocalPreciseString', () => {
  it('formats a date using local time components (no Z)', () => {
    const d = new Date(2026, 1, 10, 14, 12, 59, 531); // local 14:12:59.531
    expect(toLocalPreciseString(d)).toBe('2026-02-10T14:12:59.531');
  });

  it('zero-pads all fields', () => {
    const d = new Date(2026, 0, 5, 9, 3, 7, 42); // Jan 5, 09:03:07.042
    expect(toLocalPreciseString(d)).toBe('2026-01-05T09:03:07.042');
  });

  it('does not produce a Z suffix (output is local, not UTC)', () => {
    const d = new Date(2026, 1, 10, 14, 0, 0, 0);
    expect(toLocalPreciseString(d)).not.toMatch(/Z$/);
  });
});

describe('isHalfHourExact', () => {
  it('returns true for exact :00 times', () => {
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 0, 0, 0))).toBe(true);
    expect(isHalfHourExact(new Date(2026, 1, 10, 0, 0, 0, 0))).toBe(true);
  });

  it('returns true for exact :30 times', () => {
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 30, 0, 0))).toBe(true);
  });

  it('returns false when seconds are non-zero', () => {
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 0, 5, 0))).toBe(false);
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 30, 1, 0))).toBe(false);
  });

  it('returns false when minutes are not 0 or 30', () => {
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 18, 0, 0))).toBe(false);
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 38, 0, 0))).toBe(false);
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 29, 0, 0))).toBe(false);
  });

  it('returns false when milliseconds are non-zero', () => {
    expect(isHalfHourExact(new Date(2026, 1, 10, 13, 0, 0, 500))).toBe(false);
  });
});

describe('roundToHalfHour', () => {
  // Dates constructed with local hours so the function reads local time correctly
  const local = (h: number, m: number) => new Date(2026, 1, 10, h, m);

  it('rounds down to :00 when minutes < 15', () => {
    expect(roundToHalfHour(local(3, 0))).toBe('03:00');
    expect(roundToHalfHour(local(3, 14))).toBe('03:00');
  });

  it('rounds to :30 when minutes are between 15 and 44', () => {
    expect(roundToHalfHour(local(3, 15))).toBe('03:30');
    expect(roundToHalfHour(local(3, 44))).toBe('03:30');
  });

  it('rounds up to the next hour :00 when minutes >= 45', () => {
    expect(roundToHalfHour(local(3, 45))).toBe('04:00');
    expect(roundToHalfHour(local(3, 59))).toBe('04:00');
  });

  it('wraps from 23:xx to 00:00 when rounding up past midnight', () => {
    expect(roundToHalfHour(local(23, 46))).toBe('00:00');
  });

  it('zero-pads single-digit hours', () => {
    expect(roundToHalfHour(local(0, 0))).toBe('00:00');
    expect(roundToHalfHour(local(9, 30))).toBe('09:30');
  });
});

describe('toUTCISOString', () => {
  it('builds an ISO string from local date components and a local HH:mm string', () => {
    const localDate = new Date(2026, 1, 10); // Feb 10 2026 local midnight
    expect(toUTCISOString(localDate, '06:30')).toBe(new Date(2026, 1, 10, 6, 30).toISOString());
  });

  it('produces midnight ISO when hourStr is 00:00', () => {
    const localDate = new Date(2026, 1, 10);
    expect(toUTCISOString(localDate, '00:00')).toBe(new Date(2026, 1, 10, 0, 0).toISOString());
  });

  it('produces 23:30 local ISO when hourStr is 23:30', () => {
    const localDate = new Date(2026, 1, 10);
    expect(toUTCISOString(localDate, '23:30')).toBe(new Date(2026, 1, 10, 23, 30).toISOString());
  });

  it('uses the local calendar date (year/month/day)', () => {
    const localDate = new Date(2026, 1, 10);
    const result = toUTCISOString(localDate, '12:00');
    // The local date components must be preserved: year=2026, month=Feb, day=10, hour=12
    expect(result).toBe(new Date(2026, 1, 10, 12, 0).toISOString());
  });
});

describe('isValidTimeRange', () => {
  const baseRange = (): TimeRange => ({
    value: 'test',
    start: 'now-1d',
    end: 'now',
    startDate: new Date(0),
    endDate: new Date(1000),
    type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
    isNaturalLanguage: false,
    isInvalid: true,
  });

  it('returns false when a date is missing', () => {
    expect(isValidTimeRange({ ...baseRange(), startDate: null })).toBeFalsy();
    expect(isValidTimeRange({ ...baseRange(), endDate: null })).toBeFalsy();
  });

  it('returns true when both types are NOW', () => {
    const range = {
      ...baseRange(),
      type: [DATE_TYPE_NOW, DATE_TYPE_NOW] as TimeRange['type'],
    };

    expect(isValidTimeRange(range)).toBeTruthy();
  });

  it('returns false when start is after end', () => {
    const range = {
      ...baseRange(),
      startDate: new Date(2000),
      endDate: new Date(1000),
    };

    expect(isValidTimeRange(range)).toBeFalsy();
  });

  it('returns true when start equals end', () => {
    expect(
      isValidTimeRange({
        ...baseRange(),
        startDate: new Date(500),
        endDate: new Date(500),
        type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
      })
    ).toBeTruthy();
  });
});

describe('getOptionDisplayLabel', () => {
  it('returns the label when present', () => {
    expect(getOptionDisplayLabel({ start: 'now-15m', end: 'now', label: 'Last 15 minutes' })).toBe(
      'Last 15 minutes'
    );
  });

  it('generates a label from relative bounds when no label is provided', () => {
    expect(getOptionDisplayLabel({ start: 'now-7d', end: 'now' })).toBe('7 days ago → now');
  });

  it('generates a label from absolute bounds when no label is provided', () => {
    expect(getOptionDisplayLabel({ start: '2025-01-01', end: '2025-01-31' })).toBe(
      'Jan 1 2025, 00:00 → Jan 31 2025, 00:00'
    );
  });
});

describe('getOptionShorthand', () => {
  it('returns the start offset when end is now', () => {
    expect(getOptionShorthand({ start: 'now-15m', end: 'now' })).toBe('-15m');
    expect(getOptionShorthand({ start: 'now-7d', end: 'now' })).toBe('-7d');
    expect(getOptionShorthand({ start: 'now-1M', end: 'now' })).toBe('-1M');
  });

  it('returns the end offset when start is now', () => {
    expect(getOptionShorthand({ start: 'now', end: 'now+3d' })).toBe('+3d');
  });

  it('combines both offsets when neither is now', () => {
    expect(getOptionShorthand({ start: 'now-7d', end: 'now-1d' })).toBe('-7d to -1d');
  });

  it('returns null when a bound has rounding', () => {
    expect(getOptionShorthand({ start: 'now/d', end: 'now/d' })).toBeNull();
    expect(getOptionShorthand({ start: 'now-1d/d', end: 'now' })).toBeNull();
    expect(getOptionShorthand({ start: 'now', end: 'now+1d/d' })).toBeNull();
  });

  it('returns null when a bound is absolute', () => {
    expect(getOptionShorthand({ start: '2025-01-01', end: 'now' })).toBeNull();
    expect(getOptionShorthand({ start: 'now-7d', end: '2025-01-01' })).toBeNull();
  });

  it('returns null when both bounds are now', () => {
    expect(getOptionShorthand({ start: 'now', end: 'now' })).toBeNull();
  });
});

describe('getOptionInputText', () => {
  it('returns the label when it parses to a valid range', () => {
    expect(getOptionInputText({ start: 'now-15m', end: 'now', label: 'Last 15 minutes' })).toBe(
      'Last 15 minutes'
    );
  });

  it('falls back to shorthand when label does not parse', () => {
    expect(getOptionInputText({ start: 'now-15m', end: 'now', label: 'My custom preset' })).toBe(
      '-15m'
    );
  });

  it('generates shorthand from bounds when no label is provided', () => {
    expect(getOptionInputText({ start: 'now-15m', end: 'now' })).toBe('-15m');
    expect(getOptionInputText({ start: 'now', end: 'now+3d' })).toBe('+3d');
  });

  it('joins both fragments with delimiter when neither bound is now', () => {
    expect(getOptionInputText({ start: 'now-7d', end: 'now-1d' })).toBe('-7d to -1d');
  });

  it('keeps bounds as-is when now prefix cannot be stripped', () => {
    expect(getOptionInputText({ start: 'now/d', end: 'now/d' })).toBe('now/d to now/d');
  });

  it('returns now when both bounds are now', () => {
    expect(getOptionInputText({ start: 'now', end: 'now' })).toBe('now');
  });
});
