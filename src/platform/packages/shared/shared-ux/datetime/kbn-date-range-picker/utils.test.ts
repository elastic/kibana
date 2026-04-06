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
  msToAutoRefreshInterval,
  autoRefreshIntervalToMs,
  formatAutoRefreshCountdown,
  msToSeconds,
  getStartDate,
  getEndDate,
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
    startOffset: null,
    endOffset: null,
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
    expect(getOptionDisplayLabel({ start: 'now-7d', end: 'now' })).toBe('Last 7 days');
  });

  it('generates a label from absolute bounds when no label is provided', () => {
    expect(getOptionDisplayLabel({ start: '2025-01-01', end: '2025-01-31' })).toBe(
      'Jan 1, 2025, 00:00:00 → Jan 31, 2025, 00:00:00'
    );
  });
});

describe('getOptionShorthand', () => {
  it('returns the start offset when end is now', () => {
    expect(getOptionShorthand({ start: 'now-15m', end: 'now' })).toBe('-15m');
    expect(getOptionShorthand({ start: 'now-7d', end: 'now' })).toBe('-7d');
    expect(getOptionShorthand({ start: 'now-1M', end: 'now' })).toBe('-1mo');
  });

  it('returns the end offset when start is now', () => {
    expect(getOptionShorthand({ start: 'now', end: 'now+3d' })).toBe('+3d');
  });

  it('combines both offsets when neither is now', () => {
    expect(getOptionShorthand({ start: 'now-7d', end: 'now-1d' })).toBe('-7d to -1d');
  });

  it('returns named range alias when bounds match a known named range', () => {
    expect(getOptionShorthand({ start: 'now/d', end: 'now/d' })).toBe('td');
    expect(getOptionShorthand({ start: 'now-1d/d', end: 'now-1d/d' })).toBe('yd');
    expect(getOptionShorthand({ start: 'now+1d/d', end: 'now+1d/d' })).toBe('tmr');
  });

  it('strips start rounding when end is now', () => {
    expect(getOptionShorthand({ start: 'now-1d/d', end: 'now' })).toBe('-1d');
    expect(getOptionShorthand({ start: 'now-24h/h', end: 'now' })).toBe('-24h');
  });

  it('returns null when end has rounding (not strippable)', () => {
    expect(getOptionShorthand({ start: 'now', end: 'now+1d/d' })).toBeNull();
  });

  it('returns null when both bounds have rounding', () => {
    expect(getOptionShorthand({ start: 'now-7d/d', end: 'now-1d/d' })).toBeNull();
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

describe('getStartDate', () => {
  it('sets time to 00:00:00.000', () => {
    const d = new Date(2026, 2, 15, 14, 30, 45, 500);
    const result = getStartDate(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the year, month, and day', () => {
    const d = new Date(2026, 2, 15, 14, 30, 45, 500);
    const result = getStartDate(d);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the input', () => {
    const d = new Date(2026, 2, 15, 14, 30, 45, 500);
    const result = getStartDate(d);
    expect(result).not.toBe(d);
    expect(d.getHours()).toBe(14);
  });
});

describe('getEndDate', () => {
  it('sets time to 23:59:59.999', () => {
    const d = new Date(2026, 2, 15, 8, 0, 0, 0);
    const result = getEndDate(d);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it('preserves the year, month, and day', () => {
    const d = new Date(2026, 2, 15, 8, 0, 0, 0);
    const result = getEndDate(d);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the input', () => {
    const d = new Date(2026, 2, 15, 8, 0, 0, 0);
    const result = getEndDate(d);
    expect(result).not.toBe(d);
    expect(d.getHours()).toBe(8);
  });
});

describe('formatDateRange', () => {
  it('formats two dates with the standard delimiter (default precision = s)', () => {
    const start = new Date(2026, 1, 10, 10, 15, 30, 500);
    const end = new Date(2026, 1, 11, 23, 30, 0, 0);
    expect(formatDateRange(start, end)).toBe('Feb 10, 2026, 10:15:30 to Feb 11, 2026, 23:30:00');
  });

  it('respects timePrecision', () => {
    const start = new Date(2026, 1, 10, 10, 15, 30, 500);
    const end = new Date(2026, 1, 11, 23, 30, 0, 0);
    expect(formatDateRange(start, end, 'ms')).toBe(
      'Feb 10, 2026, 10:15:30.500 to Feb 11, 2026, 23:30:00.000'
    );
    expect(formatDateRange(start, end, 'none')).toBe('Feb 10, 2026, 10:15 to Feb 11, 2026, 23:30');
  });

  it('handles same-day ranges', () => {
    const start = new Date(2026, 2, 5, 9, 0, 0, 0);
    const end = new Date(2026, 2, 5, 17, 0, 0, 0);
    expect(formatDateRange(start, end)).toBe('Mar 5, 2026, 09:00:00 to Mar 5, 2026, 17:00:00');
  });
});

describe('msToAutoRefreshInterval (auto unit)', () => {
  it('prefers hours when divisible by 1h', () => {
    expect(msToAutoRefreshInterval(3_600_000)).toEqual({ count: 1, unit: 'h' });
    expect(msToAutoRefreshInterval(7_200_000)).toEqual({ count: 2, unit: 'h' });
  });

  it('prefers minutes when not whole hours but divisible by 1m', () => {
    expect(msToAutoRefreshInterval(120_000)).toEqual({ count: 2, unit: 'm' });
    expect(msToAutoRefreshInterval(180_000)).toEqual({ count: 3, unit: 'm' });
  });

  it('uses seconds when not divisible by 1m (e.g. 90s)', () => {
    expect(msToAutoRefreshInterval(90_000)).toEqual({ count: 90, unit: 's' });
  });

  it('round-trips through autoRefreshIntervalToMs for whole-second intervals', () => {
    const ms = 90_000;
    const { count, unit } = msToAutoRefreshInterval(ms);
    expect(autoRefreshIntervalToMs(count, unit)).toBe(ms);
  });
});

describe('msToAutoRefreshInterval (explicit unit)', () => {
  it('rounds count to the chosen unit', () => {
    expect(msToAutoRefreshInterval(90_000, 'm')).toEqual({ count: 2, unit: 'm' });
  });
});

describe('msToSeconds', () => {
  it('ceil(seconds) and guards invalid input', () => {
    expect(msToSeconds(4000)).toBe(4);
    expect(msToSeconds(1500)).toBe(2);
    expect(msToSeconds(0)).toBe(0);
    expect(msToSeconds(-100)).toBe(0);
    expect(msToSeconds(Number.NaN)).toBe(0);
  });
});

describe('formatAutoRefreshCountdown', () => {
  it('uses mm:ss under one hour', () => {
    expect(formatAutoRefreshCountdown(59)).toBe('00:59');
    expect(formatAutoRefreshCountdown(60)).toBe('01:00');
    expect(formatAutoRefreshCountdown(90)).toBe('01:30');
    expect(formatAutoRefreshCountdown(299)).toBe('04:59');
  });

  it('uses hh:mm:ss when an hour or more remains', () => {
    expect(formatAutoRefreshCountdown(3600)).toBe('01:00:00');
    expect(formatAutoRefreshCountdown(3661)).toBe('01:01:01');
    expect(formatAutoRefreshCountdown(4 * 3600 + 59 * 60 + 59)).toBe('04:59:59');
  });

  it('handles invalid input', () => {
    expect(formatAutoRefreshCountdown(0)).toBe('00:00');
    expect(formatAutoRefreshCountdown(-1)).toBe('00:00');
    expect(formatAutoRefreshCountdown(Number.NaN)).toBe('00:00');
  });
});
