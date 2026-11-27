/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { ianaTimeZone, ianaTimeZoneOrUtc } from '..';

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
