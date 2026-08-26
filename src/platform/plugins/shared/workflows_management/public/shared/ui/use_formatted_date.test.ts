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
  formatAbsoluteTimestampWithZone,
  formatTimeZoneLabel,
  resolveKibanaTimeZone,
} from './use_formatted_date';

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

describe('formatTimeZoneLabel', () => {
  it('includes zone name and UTC offset', () => {
    const label = formatTimeZoneLabel('UTC', new Date('2026-08-24T12:00:00Z'));
    expect(label).toContain('UTC');
    expect(label).toMatch(/UTC[+-]/);
  });
});

describe('formatAbsoluteTimestampWithZone', () => {
  it('formats with the configured zone and includes the zone label', () => {
    const date = new Date('2026-08-24T16:35:00Z');
    const formatted = formatAbsoluteTimestampWithZone(date, {
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      timeZoneSetting: 'UTC',
    });
    expect(formatted).toContain(moment.tz(date, 'UTC').format('MMM D, YYYY @ HH:mm:ss.SSS'));
    expect(formatted).toContain('UTC');
  });

  it('shifts values when the zone is not UTC', () => {
    const date = new Date('2026-08-24T16:35:00Z');
    const utc = formatAbsoluteTimestampWithZone(date, {
      dateFormat: 'HH:mm',
      timeZoneSetting: 'UTC',
    });
    const la = formatAbsoluteTimestampWithZone(date, {
      dateFormat: 'HH:mm',
      timeZoneSetting: 'America/Los_Angeles',
    });
    expect(utc).not.toEqual(la);
    expect(la).toContain('America/Los_Angeles');
  });
});
