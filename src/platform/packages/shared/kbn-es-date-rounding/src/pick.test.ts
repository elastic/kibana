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
