/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateRounding } from '..';
import { ianaTimeZone, nextBucketKey, roundToBucketKey, toDateRounding } from '..';

const utc = ianaTimeZone('UTC');
const rome = ianaTimeZone('Europe/Rome');
const kolkata = ianaTimeZone('Asia/Kolkata');
const saoPaulo = ianaTimeZone('America/Sao_Paulo');

const at = (iso: string): number => Date.parse(iso);

const rounding = (expression: string): DateRounding => {
  const parsed = toDateRounding(expression);
  if (!parsed) {
    throw new Error(`Unsupported test interval: ${expression}`);
  }
  return parsed;
};

const expectBucket = (
  expression: string,
  timeZone: Parameters<typeof roundToBucketKey>[2],
  timestamp: string,
  expected: { key: string; next: string }
) => {
  const parsed = rounding(expression);
  expect(roundToBucketKey(at(timestamp), parsed, timeZone)).toBe(at(expected.key));
  expect(nextBucketKey(at(timestamp), parsed, timeZone)).toBe(at(expected.next));
};

describe('toDateRounding', () => {
  it.each([
    ['100ms', { kind: 'fixed', widthMs: 100 }],
    ['30s', { kind: 'fixed', widthMs: 30_000 }],
    ['30m', { kind: 'fixed', widthMs: 1_800_000 }],
    ['12h', { kind: 'fixed', widthMs: 43_200_000 }],
    ['1d', { kind: 'calendar', unit: 'day', amount: 1 }],
    ['2d', { kind: 'fixed', widthMs: 172_800_000 }],
    ['7d', { kind: 'calendar', unit: 'isoWeek', amount: 1 }],
    ['1w', { kind: 'calendar', unit: 'isoWeek', amount: 1 }],
    ['2w', { kind: 'fixed', widthMs: 1_209_600_000 }],
    ['3M', { kind: 'calendar', unit: 'month', amount: 3 }],
    ['2y', { kind: 'calendar', unit: 'year', amount: 2 }],
  ])('parses %s', (expression, expected) => {
    expect(toDateRounding(expression)).toEqual(expected);
  });

  it.each(['', '0h', '1.5h', '1q', 'h', '1 h', 'auto'])('rejects %p', (expression) => {
    expect(toDateRounding(expression)).toBeUndefined();
  });
});

describe('fixed intervals', () => {
  it('rounds down to a multiple of the width in UTC', () => {
    expectBucket('1h', utc, '2026-06-29T10:37:00.000Z', {
      key: '2026-06-29T10:00:00.000Z',
      next: '2026-06-29T11:00:00.000Z',
    });
  });

  it('aligns hours to local time in a half-hour offset zone', () => {
    expectBucket('1h', kolkata, '2026-06-29T10:37:00.000Z', {
      key: '2026-06-29T10:30:00.000Z',
      next: '2026-06-29T11:30:00.000Z',
    });
  });

  describe('when clocks go back (Europe/Rome, 2026-10-25 at 01:00Z)', () => {
    it('keeps the first occurrence of the repeated hour as its own bucket', () => {
      expectBucket('1h', rome, '2026-10-25T00:30:00.000Z', {
        key: '2026-10-25T00:00:00.000Z',
        next: '2026-10-25T01:00:00.000Z',
      });
    });

    it('keeps the second occurrence of the repeated hour as its own bucket', () => {
      expectBucket('1h', rome, '2026-10-25T01:30:00.000Z', {
        key: '2026-10-25T01:00:00.000Z',
        next: '2026-10-25T02:00:00.000Z',
      });
    });

    it('splits the repeated 30 minute slots', () => {
      expectBucket('30m', rome, '2026-10-25T01:10:00.000Z', {
        key: '2026-10-25T01:00:00.000Z',
        next: '2026-10-25T01:30:00.000Z',
      });
    });

    it('stretches the 12 hour bucket that contains the change to 13 hours', () => {
      expectBucket('12h', rome, '2026-10-25T05:00:00.000Z', {
        key: '2026-10-24T22:00:00.000Z',
        next: '2026-10-25T11:00:00.000Z',
      });
    });

    it('keeps local noon and midnight after the change', () => {
      expectBucket('12h', rome, '2026-10-28T15:00:00.000Z', {
        key: '2026-10-28T11:00:00.000Z',
        next: '2026-10-28T23:00:00.000Z',
      });
    });
  });

  describe('when clocks go forward (Europe/Rome, 2026-03-29 at 01:00Z)', () => {
    it('steps from the last hour before the change to the first hour after it', () => {
      expectBucket('1h', rome, '2026-03-29T00:30:00.000Z', {
        key: '2026-03-29T00:00:00.000Z',
        next: '2026-03-29T01:00:00.000Z',
      });
    });

    it('rounds the first hour after the change to local 03:00', () => {
      expectBucket('1h', rome, '2026-03-29T01:30:00.000Z', {
        key: '2026-03-29T01:00:00.000Z',
        next: '2026-03-29T02:00:00.000Z',
      });
    });

    it('shrinks the 12 hour bucket that contains the change to 11 hours', () => {
      expectBucket('12h', rome, '2026-03-29T05:00:00.000Z', {
        key: '2026-03-28T23:00:00.000Z',
        next: '2026-03-29T10:00:00.000Z',
      });
    });
  });
});

describe('calendar intervals', () => {
  it('rounds days to local midnight across the clock change', () => {
    expectBucket('1d', rome, '2026-10-25T12:00:00.000Z', {
      key: '2026-10-24T22:00:00.000Z',
      next: '2026-10-25T23:00:00.000Z',
    });
  });

  it('starts the day at the transition when local midnight is skipped', () => {
    expectBucket('1d', saoPaulo, '2018-11-04T12:00:00.000Z', {
      key: '2018-11-04T03:00:00.000Z',
      next: '2018-11-05T02:00:00.000Z',
    });
  });

  it('rounds weeks to ISO weeks starting on Monday', () => {
    expectBucket('1w', utc, '2026-01-07T10:00:00.000Z', {
      key: '2026-01-05T00:00:00.000Z',
      next: '2026-01-12T00:00:00.000Z',
    });
  });

  it('follows ES when a rollback one minute after midnight repeats the previous date', () => {
    // America/St_Johns, 2009-11-01: at 00:01 NDT clocks go back to 23:01 NST on 2009-10-31.
    // ES gives the first midnight to November 1 and the repeated hour to October 31, so keys go back.
    const stJohns = ianaTimeZone('America/St_Johns');
    const day: DateRounding = { kind: 'calendar', unit: 'day', amount: 1 };
    const keyAt = (timestamp: string) =>
      new Date(roundToBucketKey(Date.parse(timestamp), day, stJohns)).toISOString();

    expect(keyAt('2009-11-01T02:30:30.000Z')).toBe('2009-11-01T02:30:00.000Z');
    expect(keyAt('2009-11-01T03:00:00.000Z')).toBe('2009-10-31T02:30:00.000Z');
    expect(keyAt('2009-11-01T03:30:00.000Z')).toBe('2009-11-01T02:30:00.000Z');
  });

  it('returns a next key before the timestamp when a rollback repeats the previous date', () => {
    const stJohns = ianaTimeZone('America/St_Johns');
    const day: DateRounding = { kind: 'calendar', unit: 'day', amount: 1 };
    const timestamp = Date.parse('2009-11-01T03:00:00.000Z');

    // The timestamp is in the repeated hour of October 31, whose next key is the first November 1 midnight.
    expect(new Date(nextBucketKey(timestamp, day, stJohns)).toISOString()).toBe(
      '2009-11-01T02:30:00.000Z'
    );
  });

  it('rounds 7 days like a week, to ISO weeks starting on Monday', () => {
    expectBucket('7d', utc, '2026-01-07T10:00:00.000Z', {
      key: '2026-01-05T00:00:00.000Z',
      next: '2026-01-12T00:00:00.000Z',
    });
  });

  it('rounds months to local month starts', () => {
    expectBucket('1M', rome, '2026-10-15T10:00:00.000Z', {
      key: '2026-09-30T22:00:00.000Z',
      next: '2026-10-31T23:00:00.000Z',
    });
  });

  it('aligns quarters to January', () => {
    expectBucket('3M', utc, '2026-05-10T00:00:00.000Z', {
      key: '2026-04-01T00:00:00.000Z',
      next: '2026-07-01T00:00:00.000Z',
    });
  });

  it('aligns other month multiples to January of year 1', () => {
    expectBucket('5M', utc, '2026-05-10T00:00:00.000Z', {
      key: '2026-01-01T00:00:00.000Z',
      next: '2026-06-01T00:00:00.000Z',
    });
  });

  it('aligns year multiples to year 1', () => {
    expectBucket('2y', utc, '2026-05-10T00:00:00.000Z', {
      key: '2025-01-01T00:00:00.000Z',
      next: '2027-01-01T00:00:00.000Z',
    });
  });
});
