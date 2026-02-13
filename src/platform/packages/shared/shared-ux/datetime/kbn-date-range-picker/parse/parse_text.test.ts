/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { textToTimeRange } from './parse_text';
import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from '../constants';

// :warning: This is not exhaustive and it's not aiming at 100% coverage, it's a start!

describe('textToTimeRange', () => {
  it('returns invalid results for empty input', () => {
    const range = textToTimeRange('  ');

    expect(range.isInvalid).toBe(true);
    expect(range.start).toBe('');
    expect(range.end).toBe('');
    expect(range.startDate).toBeNull();
    expect(range.endDate).toBeNull();
    expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE]);
  });

  it('matches preset labels case-insensitively', () => {
    const presets = [{ label: 'Last 15 Minutes', start: 'now-15m', end: 'now' }];
    const range = textToTimeRange('last 15 minutes', { presets });

    expect(range.isNaturalLanguage).toBe(true);
    expect(range.start).toBe('now-15m');
    expect(range.end).toBe('now');
    expect(range.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
    expect(range.isInvalid).toBe(false);
  });

  it.each([
    ['today', 'now/d', 'now/d'],
    ['last 7 minutes', 'now-7m', 'now'],
  ])('parses natural duration "%s"', (text, start, end) => {
    const range = textToTimeRange(text);

    expect(range.isNaturalLanguage).toBe(true);
    expect(range.start).toBe(start);
    expect(range.end).toBe(end);
    expect(range.isInvalid).toBe(false);
  });

  it('parses natural instant into a range ending now', () => {
    const range = textToTimeRange('7 minutes ago');

    expect(range.isNaturalLanguage).toBe(false);
    expect(range.start).toBe('now-7m');
    expect(range.end).toBe('now');
    expect(range.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
    expect(range.isInvalid).toBe(false);
  });

  it('treats future shorthand as now to future', () => {
    const range = textToTimeRange('+7d');

    expect(range.start).toBe('now');
    expect(range.end).toBe('now+7d');
    expect(range.type).toEqual([DATE_TYPE_NOW, DATE_TYPE_RELATIVE]);
    expect(range.isInvalid).toBe(false);
  });

  it('parses a single absolute instant to now', () => {
    const range = textToTimeRange('Feb 3 2016, 19:00');

    expect(range.start).toBe('Feb 3 2016, 19:00');
    expect(range.end).toBe('now');
    expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW]);
    expect(range.isInvalid).toBe(false);
  });

  it('parses ranges using default and custom delimiters', () => {
    const absolute = textToTimeRange('2016-02-03 to 2026-02-03');

    expect(absolute.start).toBe('2016-02-03');
    expect(absolute.end).toBe('2026-02-03');
    expect(absolute.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE]);
    expect(absolute.isInvalid).toBe(false);

    const custom = textToTimeRange('-1d until now', { delimiter: 'until' });

    expect(custom.start).toBe('now-1d');
    expect(custom.end).toBe('now');
    expect(custom.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
    expect(custom.isInvalid).toBe(false);
  });

  it('returns invalid for unparseable ranges', () => {
    const range = textToTimeRange('now to not a date');

    expect(range.isInvalid).toBe(true);
    expect(range.start).toBe('');
    expect(range.end).toBe('');
  });

  it('returns invalid for "reversed" ranges', () => {
    const range = textToTimeRange('2026-02-03 to 2016-02-03');

    expect(range.isInvalid).toBe(true);
    expect(range.start).toBe('2026-02-03');
    expect(range.end).toBe('2016-02-03');
  });
});
