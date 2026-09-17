/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { formatRelativeTime } from './format_time';

const NOW = Date.parse('2026-09-17T12:00:00Z');
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const MINUTE = 60_000;

describe('formatRelativeTime', () => {
  it('rounds to the largest fitting unit, in the past and in the future', () => {
    expect(formatRelativeTime(at(-30_000), NOW)).toBe('just now');
    expect(formatRelativeTime(at(30_000), NOW)).toBe('just now');
    expect(formatRelativeTime(at(-5 * MINUTE), NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(at(-3 * 60 * MINUTE), NOW)).toBe('3 hours ago');
    expect(formatRelativeTime(at(-2 * 24 * 60 * MINUTE), NOW)).toBe('2 days ago');
    expect(formatRelativeTime(at(5 * MINUTE), NOW)).toBe('in 5 minutes');
    expect(formatRelativeTime(at(2 * 24 * 60 * MINUTE), NOW)).toBe('in 2 days');
  });

  it('returns unparsable timestamps as they are', () => {
    expect(formatRelativeTime('yesterday', NOW)).toBe('yesterday');
  });

  it('formats in the UI locale', () => {
    const getLocale = jest.spyOn(i18n, 'getLocale').mockReturnValue('de');
    try {
      expect(formatRelativeTime(at(-5 * MINUTE), NOW)).toBe('vor 5 Minuten');
    } finally {
      getLocale.mockRestore();
    }
  });
});
