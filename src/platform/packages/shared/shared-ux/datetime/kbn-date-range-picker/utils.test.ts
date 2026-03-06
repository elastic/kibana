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
  toLocalPreciseString,
  isValidTimeRange,
  getOptionDisplayLabel,
  getOptionShorthand,
  getOptionInputText,
  formatDateRange,
  combineDateAndTime,
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

describe('formatDateRange', () => {
  it('formats two dates with the standard delimiter', () => {
    const start = new Date(2026, 1, 10, 10, 15, 30, 500);
    const end = new Date(2026, 1, 11, 23, 30, 0, 0);
    expect(formatDateRange(start, end)).toBe('2026-02-10T10:15:30.500 to 2026-02-11T23:30:00.000');
  });

  it('uses local time (no Z suffix)', () => {
    const start = new Date(2026, 0, 1, 0, 0, 0, 0);
    const end = new Date(2026, 0, 2, 0, 0, 0, 0);
    const result = formatDateRange(start, end);
    expect(result).not.toMatch(/Z/);
  });

  it('handles same-day ranges', () => {
    const start = new Date(2026, 2, 5, 9, 0, 0, 0);
    const end = new Date(2026, 2, 5, 17, 0, 0, 0);
    expect(formatDateRange(start, end)).toBe('2026-03-05T09:00:00.000 to 2026-03-05T17:00:00.000');
  });
});

describe('combineDateAndTime', () => {
  it('combines date from first arg with time from second arg', () => {
    const date = new Date(2026, 1, 10, 0, 0, 0, 0); // Feb 10
    const time = new Date(2026, 5, 15, 14, 30, 45, 123); // different date, 14:30:45.123
    const result = combineDateAndTime(date, time);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(45);
    expect(result.getMilliseconds()).toBe(123);
  });

  it('uses default hour/minute when timeSource is null', () => {
    const date = new Date(2026, 1, 10, 12, 0, 0, 0);
    const result = combineDateAndTime(date, null, 23, 30);

    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('uses 0 for defaults when not specified', () => {
    const date = new Date(2026, 1, 10, 12, 0, 0, 0);
    const result = combineDateAndTime(date, null);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('preserves seconds and milliseconds from timeSource', () => {
    const date = new Date(2026, 1, 10, 0, 0, 0, 0);
    const time = new Date(2026, 1, 10, 10, 15, 59, 999);
    const result = combineDateAndTime(date, time);

    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});
