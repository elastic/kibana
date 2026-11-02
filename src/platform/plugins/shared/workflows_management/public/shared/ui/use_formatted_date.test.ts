/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatExecutionTimestamp, resolveKibanaTimeZone } from './use_formatted_date';

describe('resolveKibanaTimeZone', () => {
  it('resolves Browser to a guessed IANA zone', () => {
    const zone = resolveKibanaTimeZone('Browser');
    expect(zone).toBeTruthy();
    expect(zone).not.toBe('Browser');
  });

  it('passes through named zones', () => {
    expect(resolveKibanaTimeZone('UTC')).toBe('UTC');
    expect(resolveKibanaTimeZone('America/Los_Angeles')).toBe('America/Los_Angeles');
  });
});

describe('formatExecutionTimestamp', () => {
  const now = new Date('2026-08-24T18:00:00Z');

  describe('tooltip', () => {
    it('formats UTC with milliseconds and a UTC designator', () => {
      expect(
        formatExecutionTimestamp('2026-08-24T18:26:58.239Z', 'tooltip', {
          timeZoneSetting: 'UTC',
        })
      ).toBe('Aug 24, 2026 @ 18:26:58.239 UTC');
    });

    it('uses the short zone abbreviation, not the IANA id or a parenthesized offset', () => {
      const formatted = formatExecutionTimestamp('2026-08-24T18:26:58.239Z', 'tooltip', {
        timeZoneSetting: 'America/Los_Angeles',
      });
      expect(formatted).toBe('Aug 24, 2026 @ 11:26:58.239 PDT');
      expect(formatted).not.toContain('America/Los_Angeles');
      expect(formatted).not.toContain('(');
    });

    it('falls back to GMT±offset when the zone has no abbreviation', () => {
      const formatted = formatExecutionTimestamp('2026-08-24T18:26:58.239Z', 'tooltip', {
        timeZoneSetting: 'Asia/Kathmandu',
      });
      expect(formatted).toBe('Aug 25, 2026 @ 00:11:58.239 GMT+5:45');
    });

    it('returns null for empty values', () => {
      expect(formatExecutionTimestamp(null, 'tooltip', { timeZoneSetting: 'UTC' })).toBeNull();
      expect(formatExecutionTimestamp('', 'tooltip', { timeZoneSetting: 'UTC' })).toBeNull();
    });
  });

  describe('started', () => {
    it('formats today as time only', () => {
      expect(
        formatExecutionTimestamp('2026-08-24T16:35:00Z', 'started', {
          timeZoneSetting: 'UTC',
          now,
        })
      ).toBe('16:35');
    });

    it('formats yesterday with the day word', () => {
      expect(
        formatExecutionTimestamp('2026-08-23T22:04:00Z', 'started', {
          timeZoneSetting: 'UTC',
          now,
        })
      ).toBe('Yesterday 22:04');
    });

    it('formats older days as short date + time', () => {
      expect(
        formatExecutionTimestamp('2026-08-17T14:03:00Z', 'started', {
          timeZoneSetting: 'UTC',
          now,
        })
      ).toBe('Aug 17 14:03');
    });
  });

  describe('header', () => {
    it('uses the same family without milliseconds or a zone', () => {
      expect(
        formatExecutionTimestamp('2026-08-24T18:26:58.239Z', 'header', {
          timeZoneSetting: 'UTC',
        })
      ).toBe('Aug 24, 2026 @ 18:26:58');
    });

    it('does not put @ before the year', () => {
      const formatted = formatExecutionTimestamp('2026-08-18T12:19:14.000Z', 'header', {
        timeZoneSetting: 'UTC',
      });
      expect(formatted).toBe('Aug 18, 2026 @ 12:19:14');
      expect(formatted).not.toMatch(/@ \d{4}/);
    });
  });
});
