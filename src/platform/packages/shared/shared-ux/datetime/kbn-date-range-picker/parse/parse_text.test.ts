/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { textToTimeRange, matchPreset } from './parse_text';
import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from '../constants';

describe('textToTimeRange', () => {
  it('returns invalid results for empty input', () => {
    const range = textToTimeRange('  ');

    expect(range.isInvalid).toBe(true);
    expect(range.start).toBe('');
    expect(range.end).toBe('');
    expect(range.startDate).toBeNull();
    expect(range.endDate).toBeNull();
    expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE]);
    expect(range.startOffset).toBeNull();
    expect(range.endOffset).toBeNull();
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

  it('parses ranges using locale and custom delimiters', () => {
    const withTo = textToTimeRange('2016-02-03 to 2026-02-03');

    expect(withTo.start).toBe('2016-02-03');
    expect(withTo.end).toBe('2026-02-03');
    expect(withTo.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE]);
    expect(withTo.isInvalid).toBe(false);

    const withUntil = textToTimeRange('-1d until now');

    expect(withUntil.start).toBe('now-1d');
    expect(withUntil.end).toBe('now');
    expect(withUntil.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
    expect(withUntil.isInvalid).toBe(false);
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

  // --- Shorthand ---

  describe('shorthand', () => {
    it.each([
      ['7d', 'now-7d', 'now'],
      ['-7d', 'now-7d', 'now'],
      ['now-7d', 'now-7d', 'now'],
      ['+7d', 'now', 'now+7d'],
      ['now+7d', 'now', 'now+7d'],
      ['-7d/d', 'now-7d/d', 'now'],
      ['500ms', 'now-500ms', 'now'],
      ['7min', 'now-7m', 'now'],
      ['3mos', 'now-3M', 'now'],
      ['7hrs', 'now-7h', 'now'],
      ['2wks', 'now-2w', 'now'],
      ['1yr', 'now-1y', 'now'],
    ])('parses "%s" into start=%s end=%s', (text, start, end) => {
      const range = textToTimeRange(text);

      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
      expect(range.isInvalid).toBe(false);
      expect(range.isNaturalLanguage).toBe(false);
    });

    it('does not parse bare numbers as shorthand (no unit = not shorthand)', () => {
      const range = textToTimeRange('7');
      expect(range.start).not.toBe('now-7m');
    });
  });

  // --- Named ranges ---

  describe('named ranges', () => {
    it.each([
      ['yesterday', 'now-1d/d', 'now-1d/d'],
      ['tomorrow', 'now+1d/d', 'now+1d/d'],
      ['this week', 'now/w', 'now/w'],
      ['this month', 'now/M', 'now/M'],
      ['this year', 'now/y', 'now/y'],
      ['last week', 'now-1w/w', 'now-1w/w'],
      ['last month', 'now-1M/M', 'now-1M/M'],
      ['last year', 'now-1y/y', 'now-1y/y'],
    ])('parses "%s"', (text, start, end) => {
      const range = textToTimeRange(text);

      expect(range.isNaturalLanguage).toBe(true);
      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
      expect(range.isInvalid).toBe(false);
    });
  });

  // --- Natural instant (future) ---

  describe('natural instant (future)', () => {
    it.each([
      ['7 minutes from now', 'now', 'now+7m'],
      ['in 7 minutes', 'now', 'now+7m'],
      ['in 3 days', 'now', 'now+3d'],
    ])('parses "%s"', (text, start, end) => {
      const range = textToTimeRange(text);

      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
      expect(range.isInvalid).toBe(false);
      expect(range.isNaturalLanguage).toBe(false);
    });
  });

  // --- Natural duration (future) ---

  it('parses future natural duration "next 7 days"', () => {
    const range = textToTimeRange('next 7 days');

    expect(range.isNaturalLanguage).toBe(true);
    expect(range.start).toBe('now');
    expect(range.end).toBe('now+7d');
    expect(range.isInvalid).toBe(false);
  });

  // --- Unix timestamps ---

  describe('unix timestamps', () => {
    it('parses 10-digit seconds timestamp', () => {
      const range = textToTimeRange('1454529600');

      expect(range.start).toBe(new Date(1454529600 * 1000).toISOString());
      expect(range.end).toBe('now');
      expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW]);
      expect(range.isInvalid).toBe(false);
    });

    it('parses 13-digit milliseconds timestamp', () => {
      const range = textToTimeRange('1454529600000');

      expect(range.start).toBe(new Date(1454529600000).toISOString());
      expect(range.end).toBe('now');
      expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW]);
      expect(range.isInvalid).toBe(false);
    });
  });

  // --- Universal `-` delimiter ---

  it('accepts - (with spaces) as a universal delimiter', () => {
    const range = textToTimeRange('now-7d - now');

    expect(range.start).toBe('now-7d');
    expect(range.end).toBe('now');
    expect(range.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
    expect(range.isInvalid).toBe(false);
  });

  // --- Range type combinations ---

  describe('range type combinations', () => {
    it.each([
      ['now-7d to now', DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
      ['now to now+7d', DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
      ['2016-02-03 to now', DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
      ['now to 2030-02-03', DATE_TYPE_NOW, DATE_TYPE_ABSOLUTE],
      ['now-7d to now-1d', DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
      ['2016-02-03 to 2026-02-03', DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
      ['now-7d to 2030-02-03', DATE_TYPE_RELATIVE, DATE_TYPE_ABSOLUTE],
      ['2016-02-03 to now+7d', DATE_TYPE_ABSOLUTE, DATE_TYPE_RELATIVE],
    ])('"%s" → [%s, %s]', (text, startType, endType) => {
      const range = textToTimeRange(text);

      expect(range.type).toEqual([startType, endType]);
      expect(range.isInvalid).toBe(false);
    });
  });

  // --- DateOffset assertions ---

  describe('DateOffset', () => {
    it('populates startOffset for relative start', () => {
      const range = textToTimeRange('-7d');

      expect(range.startOffset).toEqual({ count: -7, unit: 'd' });
      expect(range.endOffset).toBeNull();
    });

    it('populates endOffset for relative end', () => {
      const range = textToTimeRange('+3d');

      expect(range.startOffset).toBeNull();
      expect(range.endOffset).toEqual({ count: 3, unit: 'd' });
    });

    it('populates both offsets for relative-relative range', () => {
      const range = textToTimeRange('now-7d to now-1d');

      expect(range.startOffset).toEqual({ count: -7, unit: 'd' });
      expect(range.endOffset).toEqual({ count: -1, unit: 'd' });
    });

    it('includes roundTo when rounding is present', () => {
      const range = textToTimeRange('-7d/d');

      expect(range.startOffset).toEqual({ count: -7, unit: 'd', roundTo: 'd' });
    });

    it('returns null offsets for absolute dates', () => {
      const range = textToTimeRange('2016-02-03 to 2026-02-03');

      expect(range.startOffset).toBeNull();
      expect(range.endOffset).toBeNull();
    });

    it('returns null offsets for NOW type', () => {
      const range = textToTimeRange('now to now+7d');

      expect(range.startOffset).toBeNull();
      expect(range.endOffset).toEqual({ count: 7, unit: 'd' });
    });

    it('populates offset for ms unit', () => {
      const range = textToTimeRange('500ms');

      expect(range.startOffset).toEqual({ count: -500, unit: 'ms' });
    });

    it('populates offset from preset with relative bounds', () => {
      const presets = [{ label: 'Quick 15m', start: 'now-15m', end: 'now' }];
      const range = textToTimeRange('Quick 15m', { presets });

      expect(range.startOffset).toEqual({ count: -15, unit: 'm' });
      expect(range.endOffset).toBeNull();
    });
  });
});

describe('matchPreset', () => {
  const presets = [
    { label: 'Last 15 Minutes', start: 'now-15m', end: 'now' },
    { label: 'Today', start: 'now/d', end: 'now/d' },
  ];

  it('matches case-insensitively', () => {
    expect(matchPreset('last 15 minutes', presets)).toBe(presets[0]);
    expect(matchPreset('TODAY', presets)).toBe(presets[1]);
  });

  it('returns undefined for no match', () => {
    expect(matchPreset('no match', presets)).toBeUndefined();
  });
});
