/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import {
  durationAsRange,
  fitsInBuckets,
  ianaTimeZone,
  ianaTimeZoneOrUtc,
  pickDateRounding,
} from '..';
import type { ZonedDateRange } from '..';

describe('pickDateRounding', () => {
  const timeZone = ianaTimeZone('UTC');
  const from = Date.UTC(2024, 0, 1);
  const hour = 36e5;
  const day = 864e5;

  const rangeFor = (durationMs: number): ZonedDateRange => ({
    from,
    to: from + durationMs,
    timeZone,
  });

  const expectPick = (durationMs: number, maxBuckets: number, expression: string) => {
    const range = rangeFor(durationMs);
    const interval = pickDateRounding(maxBuckets, range);
    expect(interval.expression).toBe(expression);
    expect(fitsInBuckets(interval, range, maxBuckets)).toBe(true);
  };

  it('picks 1m for 1 hour / 100', () => {
    expectPick(hour, 100, '1m');
  });

  it('picks 30m for 24 hours / 100', () => {
    expectPick(24 * hour, 100, '30m');
  });

  it('picks 1h for 2 hours / 3', () => {
    expectPick(2 * hour, 3, '1h');
  });

  it('picks 1h for 4 days / 100', () => {
    expectPick(4 * day, 100, '1h');
  });

  it('picks 3h for 4 days / 75', () => {
    expectPick(4 * day, 75, '3h');
  });

  it('picks 10s for 15 minutes / 100', () => {
    expectPick(15 * 60 * 1000, 100, '10s');
  });

  it('picks 1M for 1 year / 20', () => {
    expectPick(365 * day, 20, '1M');
  });

  it('picks 1w for 1 year / 100', () => {
    expectPick(365 * day, 100, '1w');
  });

  it('rejects 1h for a 100 hour Asia/Kolkata range that spans 101 local hours', () => {
    const kolkata = ianaTimeZone('Asia/Kolkata');
    const range: ZonedDateRange = {
      from,
      to: from + 100 * hour,
      timeZone: kolkata,
    };
    const interval = pickDateRounding(100, range);
    expect(interval.expression).toBe('3h');
    expect(fitsInBuckets({ expression: '1h', kind: 'fixed', nominalMs: hour }, range, 100)).toBe(
      false
    );
  });

  it('rejects 3h for a New York spring-forward range that spans 101 zoned buckets', () => {
    const ny = ianaTimeZone('America/New_York');
    const range: ZonedDateRange = {
      from: Date.parse('2024-03-09T05:00:00.000Z'),
      to: Date.parse('2024-03-21T17:00:00.000Z'),
      timeZone: ny,
    };
    const interval = pickDateRounding(100, range);
    expect(interval.expression).toBe('12h');
    expect(
      fitsInBuckets({ expression: '3h', kind: 'fixed', nominalMs: 3 * hour }, range, 100)
    ).toBe(false);
  });

  it('accepts 3h for a New York fall-back range that elapsed-hour counting over-counts', () => {
    const ny = ianaTimeZone('America/New_York');
    const range: ZonedDateRange = {
      from: Date.parse('2024-11-02T04:00:00.000Z'),
      to: Date.parse('2024-11-14T17:00:00.000Z'),
      timeZone: ny,
    };
    const interval = pickDateRounding(100, range);
    expect(interval.expression).toBe('3h');
    expect(
      fitsInBuckets({ expression: '3h', kind: 'fixed', nominalMs: 3 * hour }, range, 100)
    ).toBe(true);
  });

  it('picks 3h, not 1h, when a 30 minute Lord Howe forward jump adds a shortened bucket', () => {
    const range: ZonedDateRange = {
      from: Date.parse('2024-10-05T13:30:00.000Z'),
      to: Date.parse('2024-10-09T18:00:00.000Z'),
      timeZone: ianaTimeZone('Australia/Lord_Howe'),
    };
    expect(pickDateRounding(100, range).expression).toBe('3h');
  });

  it('starts a day at the first valid local time when a forward jump skips midnight', () => {
    const range: ZonedDateRange = {
      from: Date.parse('2024-09-07T04:00:00.000Z'),
      to: Date.parse('2024-09-10T03:00:00.000Z'),
      timeZone: ianaTimeZone('America/Santiago'),
    };
    const oneDay = { expression: '1d', kind: 'calendar' as const, nominalMs: day };
    expect(fitsInBuckets(oneDay, range, 3)).toBe(true);
    expect(fitsInBuckets(oneDay, range, 2)).toBe(false);
  });

  it('starts a day at the transition when a 45 minute forward jump skips midnight', () => {
    const range: ZonedDateRange = {
      from: Date.parse('1975-07-31T12:00:00.000Z'),
      to: Date.parse('1975-08-01T12:00:00.000Z'),
      timeZone: ianaTimeZone('America/Guyana'),
    };
    const oneDay = { expression: '1d', kind: 'calendar' as const, nominalMs: day };
    expect(fitsInBuckets(oneDay, range, 2)).toBe(true);
    expect(fitsInBuckets(oneDay, range, 1)).toBe(false);
  });

  it('handles targets far above any real bar count without walking every bucket', () => {
    const range = rangeFor(365 * day);
    expect(pickDateRounding(1e8, range).expression).toBe('1s');
    expect(
      fitsInBuckets({ expression: '1ms', kind: 'fixed', nominalMs: 1 }, rangeFor(day), 1e9)
    ).toBe(true);
  });
});

describe('fitsInBuckets across UTC offset changes', () => {
  const minute = 6e4;
  const hour = 36e5;

  // `buckets` is the number of distinct ES `fixed_interval` + `time_zone` keys in [from, to).
  it.each([
    {
      change: '30m forward jump',
      zone: 'Australia/Lord_Howe',
      from: '2024-10-05T13:30:00.000Z',
      to: '2024-10-09T18:00:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 101,
    },
    {
      change: 'range starting inside the shortened bucket after a 30m jump',
      zone: 'Australia/Lord_Howe',
      from: '2024-10-05T15:40:00.000Z',
      to: '2024-10-05T21:40:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 7,
    },
    {
      change: '1h forward jump at :45',
      zone: 'Pacific/Chatham',
      from: '2024-09-28T10:00:00.000Z',
      to: '2024-09-28T20:00:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 12,
    },
    {
      change: '1h forward jump at :45',
      zone: 'Pacific/Chatham',
      from: '2024-09-28T13:00:00.000Z',
      to: '2024-09-28T15:00:00.000Z',
      expression: '10m',
      nominalMs: 10 * minute,
      buckets: 14,
    },
    {
      change: '15m forward jump',
      zone: 'Asia/Kathmandu',
      from: '1985-12-31T12:00:00.000Z',
      to: '1986-01-01T00:00:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 13,
    },
    {
      change: '45m forward jump',
      zone: 'America/Guyana',
      from: '1975-08-01T00:00:00.000Z',
      to: '1975-08-01T08:00:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 9,
    },
    {
      change: '44m30s forward jump',
      zone: 'Africa/Monrovia',
      from: '1972-01-06T20:00:00.000Z',
      to: '1972-01-07T04:00:00.000Z',
      expression: '1h',
      nominalMs: hour,
      buckets: 9,
    },
    {
      change: 'midnight forward jump',
      zone: 'Asia/Beirut',
      from: '2024-03-30T10:00:00.000Z',
      to: '2024-03-31T10:00:00.000Z',
      expression: '3h',
      nominalMs: 3 * hour,
      buckets: 9,
    },
    {
      change: 'midnight forward jump',
      zone: 'America/Santiago',
      from: '2024-09-07T12:00:00.000Z',
      to: '2024-09-08T12:00:00.000Z',
      expression: '12h',
      nominalMs: 12 * hour,
      buckets: 3,
    },
    {
      change: '02:00 forward jump with a manual interval',
      zone: 'America/New_York',
      from: '2024-03-10T00:00:00.000Z',
      to: '2024-03-10T12:00:00.000Z',
      expression: '2h',
      nominalMs: 2 * hour,
      buckets: 7,
    },
    {
      change: 'backward jump',
      zone: 'America/New_York',
      from: '2024-11-02T04:00:00.000Z',
      to: '2024-11-14T17:00:00.000Z',
      expression: '3h',
      nominalMs: 3 * hour,
      buckets: 100,
    },
  ])(
    'counts $buckets $expression buckets for a $zone $change',
    ({ zone, from, to, expression, nominalMs, buckets }) => {
      const range: ZonedDateRange = {
        from: Date.parse(from),
        to: Date.parse(to),
        timeZone: ianaTimeZone(zone),
      };
      const interval = { expression, kind: 'fixed' as const, nominalMs };
      expect(fitsInBuckets(interval, range, buckets)).toBe(true);
      expect(fitsInBuckets(interval, range, buckets - 1)).toBe(false);
    }
  );
});

describe('fitsInBuckets', () => {
  const timeZone = ianaTimeZone('UTC');
  const from = Date.UTC(2024, 0, 1);
  const range: ZonedDateRange = {
    from,
    to: from + 6 * 864e5,
    timeZone,
  };

  it('counts a manual 20m interval that is not on the picker ladder', () => {
    expect(fitsInBuckets({ expression: '20m', kind: 'fixed', nominalMs: 20 * 6e4 }, range, 4)).toBe(
      false
    );
    expect(
      fitsInBuckets({ expression: '20m', kind: 'fixed', nominalMs: 20 * 6e4 }, range, 500)
    ).toBe(true);
  });

  it('counts 45m buckets from unix epoch, not by restarting each hour', () => {
    const fortyFiveMin = {
      expression: '45m',
      kind: 'fixed' as const,
      nominalMs: 45 * 6e4,
    };
    const threeHours: ZonedDateRange = {
      from: Date.UTC(2024, 0, 1, 10, 0),
      to: Date.UTC(2024, 0, 1, 13, 0),
      timeZone,
    };
    // Epoch-aligned 45m starts at 09:45 and needs 5 buckets. Hour-restarted 45m would need 6.
    expect(fitsInBuckets(fortyFiveMin, threeHours, 5)).toBe(true);
    expect(fitsInBuckets(fortyFiveMin, threeHours, 4)).toBe(false);
  });
});

describe('ianaTimeZone', () => {
  it('rejects Browser', () => {
    expect(() => ianaTimeZone('Browser')).toThrow();
  });
});

describe('ianaTimeZoneOrUtc', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a valid IANA id', () => {
    expect(ianaTimeZoneOrUtc('America/New_York')).toBe('America/New_York');
  });

  it('resolves Browser to the local IANA zone', () => {
    jest.spyOn(moment.tz, 'guess').mockReturnValue('America/Chicago');
    expect(ianaTimeZoneOrUtc('Browser')).toBe('America/Chicago');
  });

  it('falls back to UTC when Browser guess is not a valid IANA id', () => {
    jest.spyOn(moment.tz, 'guess').mockReturnValue('Not/AZone');
    expect(ianaTimeZoneOrUtc('Browser')).toBe('UTC');
  });

  it('falls back to UTC for empty, unknown, and missing ids', () => {
    expect(ianaTimeZoneOrUtc('UTC')).toBe('UTC');
    expect(ianaTimeZoneOrUtc('')).toBe('UTC');
    expect(ianaTimeZoneOrUtc('Not/AZone')).toBe('UTC');
    expect(ianaTimeZoneOrUtc(undefined)).toBe('UTC');
  });
});

describe('durationAsRange', () => {
  it('rejects 0', () => {
    expect(() => durationAsRange(0)).toThrow();
  });
});
