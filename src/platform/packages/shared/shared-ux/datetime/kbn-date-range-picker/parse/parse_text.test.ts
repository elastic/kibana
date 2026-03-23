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
import { getOptionInputText, toLocalPreciseString } from '../utils';

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

  it('parses ranges using built-in and custom delimiters', () => {
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

  it('parses local precise format (no Z) as local time', () => {
    const range = textToTimeRange('2026-03-09T15:36:07.801');

    expect(range.isInvalid).toBe(false);
    expect(range.start).toBe('2026-03-09T15:36:07.801');
    expect(range.end).toBe('now');
    expect(range.startDate).not.toBeNull();
    expect(range.startDate?.getHours()).toBe(15);
    expect(range.startDate?.getMinutes()).toBe(36);
  });

  it('round-trips toLocalPreciseString through parse', () => {
    const original = new Date(2026, 2, 9, 15, 36, 7, 801);
    const formatted = toLocalPreciseString(original);
    const range = textToTimeRange(formatted);

    expect(range.isInvalid).toBe(false);
    expect(range.startDate?.getTime()).toBe(original.getTime());
  });

  describe('shorthands', () => {
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

  it('parses future natural duration "next 7 days"', () => {
    const range = textToTimeRange('next 7 days');

    expect(range.isNaturalLanguage).toBe(true);
    expect(range.start).toBe('now');
    expect(range.end).toBe('now+7d');
    expect(range.isInvalid).toBe(false);
  });

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

  describe('universal dash delimiter', () => {
    it('splits on dash surrounded by spaces', () => {
      const range = textToTimeRange('now-7d - now');

      expect(range.start).toBe('now-7d');
      expect(range.end).toBe('now');
      expect(range.type).toEqual([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]);
      expect(range.isInvalid).toBe(false);
    });
  });

  describe('type combinations', () => {
    it.each([
      ['now-7d to now', DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
      ['now to now+7d', DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
      ['2016-02-03 to now', DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
      ['now to 2030-02-03', DATE_TYPE_NOW, DATE_TYPE_ABSOLUTE],
      ['now-7d to now-1d', DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
      ['2016-02-03 to 2026-02-03', DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
      ['now-7d to 2030-02-03', DATE_TYPE_RELATIVE, DATE_TYPE_ABSOLUTE],
      ['2016-02-03 to now+7d', DATE_TYPE_ABSOLUTE, DATE_TYPE_RELATIVE],
    ])('"%s" -> [%s, %s]', (text, startType, endType) => {
      const range = textToTimeRange(text);

      expect(range.type).toEqual([startType, endType]);
      expect(range.isInvalid).toBe(false);
    });
  });

  describe('forgiving absolute dates', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-15T12:00:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it.each([
      ['Nov 10 2025 12:34', { year: 2025, month: 10, day: 10, hour: 12, minute: 34 }],
      ['Nov 10 2025', { year: 2025, month: 10, day: 10, hour: 0, minute: 0 }],
      ['Nov 10', { year: 2025, month: 10, day: 10, hour: 0, minute: 0 }],
      ['Nov', { year: 2025, month: 10, day: 1, hour: 0, minute: 0 }],
    ])('parses partial input "%s"', (text, expected) => {
      const range = textToTimeRange(text);

      expect(range.start).toBe(text);
      expect(range.end).toBe('now');
      expect(range.type).toEqual([DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW]);

      const d = range.startDate!;
      expect(d).toBeInstanceOf(Date);
      expect(d.getFullYear()).toBe(expected.year);
      expect(d.getMonth()).toBe(expected.month);
      expect(d.getDate()).toBe(expected.day);
      expect(d.getHours()).toBe(expected.hour);
      expect(d.getMinutes()).toBe(expected.minute);
    });

    it('does not mangle ISO dates with non-strict parsing', () => {
      const range = textToTimeRange('1970-01-01');

      expect(range.isInvalid).toBe(false);
      expect(range.startDate!.getFullYear()).toBe(1970);
      expect(range.startDate!.getMonth()).toBe(0);
      expect(range.startDate!.getDate()).toBe(1);
    });

    it('still rejects gibberish', () => {
      expect(textToTimeRange('hello world').isInvalid).toBe(true);
      expect(textToTimeRange('not a date').isInvalid).toBe(true);
    });
  });

  describe('date offset', () => {
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

  describe('unit case sensitivity (resolveUnit)', () => {
    it('resolves uppercase M as month', () => {
      const range = textToTimeRange('7 M ago');

      expect(range.start).toBe('now-7M');
      expect(range.isInvalid).toBe(false);
    });

    it('resolves lowercase m as minute', () => {
      const range = textToTimeRange('7 m ago');

      expect(range.start).toBe('now-7m');
      expect(range.isInvalid).toBe(false);
    });

    it('resolves "months" as M and "minutes" as m', () => {
      const monthRange = textToTimeRange('3 months ago');
      expect(monthRange.start).toBe('now-3M');

      const minuteRange = textToTimeRange('3 minutes ago');
      expect(minuteRange.start).toBe('now-3m');
    });

    it('resolves shorthand aliases: min -> m, mos -> M', () => {
      const minRange = textToTimeRange('5min');
      expect(minRange.start).toBe('now-5m');

      const mosRange = textToTimeRange('5mos');
      expect(mosRange.start).toBe('now-5M');
    });
  });

  describe('roundRelativeTime', () => {
    const opts = (round: boolean) => ({ roundRelativeTime: round });

    describe('true — adds rounding', () => {
      it.each([
        ['last 7 days', 'now-7d/d', 'now'],
        ['last 2 weeks', 'now-2w/d', 'now'],
        ['last 3 months', 'now-3M/d', 'now'],
        ['last 1 year', 'now-1y/d', 'now'],
      ])('natural duration (day+) "%s" → start=%s', (text, start, end) => {
        const range = textToTimeRange(text, opts(true));

        expect(range.start).toBe(start);
        expect(range.end).toBe(end);
        expect(range.value).toBe(text);
      });

      it.each([
        ['last 30 minutes', 'now-30m/m', 'now'],
        ['last 3 hours', 'now-3h/h', 'now'],
        ['last 10 seconds', 'now-10s/m', 'now'],
        ['last 500 milliseconds', 'now-500ms/s', 'now'],
      ])('natural duration (sub-day) "%s" → start=%s', (text, start, end) => {
        const range = textToTimeRange(text, opts(true));

        expect(range.start).toBe(start);
        expect(range.end).toBe(end);
        expect(range.value).toBe(text);
      });

      it.each([
        ['-7d', 'now-7d/d'],
        ['7d', 'now-7d/d'],
        ['30m', 'now-30m/m'],
        ['3h', 'now-3h/h'],
        ['500ms', 'now-500ms/s'],
      ])('shorthand "%s" → start=%s', (text, start) => {
        const range = textToTimeRange(text, opts(true));

        expect(range.start).toBe(start);
        expect(range.end).toBe('now');
        expect(range.value).toBe(text);
      });

      it.each([
        ['now-30m to now', 'now-30m/m', 'now'],
        ['-7d to now', 'now-7d/d', 'now'],
        ['now-3h to now-1h', 'now-3h/h', 'now-1h'],
      ])('delimiter-split "%s" → start=%s end=%s', (text, start, end) => {
        const range = textToTimeRange(text, opts(true));

        expect(range.start).toBe(start);
        expect(range.end).toBe(end);
        expect(range.value).toBe(text);
      });

      it.each([
        ['-3w/w', 'now-3w/w'],
        ['-60s/h', 'now-60s/h'],
        ['-7d/M', 'now-7d/M'],
      ])('preserves existing rounding "%s" even when it differs from inferred', (text, start) => {
        const range = textToTimeRange(text, opts(true));

        expect(range.start).toBe(start);
      });

      it('rounds future start in delimiter-split path', () => {
        const range = textToTimeRange('now+3d to now+7d', opts(true));

        expect(range.start).toBe('now+3d/d');
        expect(range.end).toBe('now+7d');
      });
    });

    describe('true — no-op cases', () => {
      it('does not round bare "now" as start', () => {
        const range = textToTimeRange('+7d', opts(true));

        expect(range.start).toBe('now');
        expect(range.end).toBe('now+7d');
      });

      it('does not round future natural duration start', () => {
        const range = textToTimeRange('next 7 days', opts(true));

        expect(range.start).toBe('now');
        expect(range.end).toBe('now+7d');
      });

      it('does not affect named ranges', () => {
        const range = textToTimeRange('today', opts(true));

        expect(range.start).toBe('now/d');
        expect(range.end).toBe('now/d');
      });

      it('does not affect preset matches', () => {
        const presets = [{ label: 'Last 15 Minutes', start: 'now-15m', end: 'now' }];
        const range = textToTimeRange('Last 15 Minutes', { presets, roundRelativeTime: true });

        expect(range.start).toBe('now-15m');
        expect(range.end).toBe('now');
      });

      it('never modifies end', () => {
        const range = textToTimeRange('now-7d to now-1d', opts(true));

        expect(range.end).toBe('now-1d');
      });
    });

    describe('false — strips rounding', () => {
      it('removes existing rounding suffix', () => {
        const range = textToTimeRange('-7d/d', opts(false));

        expect(range.start).toBe('now-7d');
      });

      it('is a no-op when no rounding is present', () => {
        const range = textToTimeRange('-7d', opts(false));

        expect(range.start).toBe('now-7d');
      });
    });

    describe('undefined (default) — no transformation', () => {
      it('leaves start as-is', () => {
        const withRound = textToTimeRange('-7d/d');
        expect(withRound.start).toBe('now-7d/d');

        const withoutRound = textToTimeRange('-7d');
        expect(withoutRound.start).toBe('now-7d');
      });
    });
  });

  describe('round-trip through getOptionInputText', () => {
    it.each([
      ['relative to now', 'now-15m', 'now'],
      ['now to relative', 'now', 'now+7d'],
      ['relative to relative', 'now-7d', 'now-1d'],
    ])('%s: parse(getOptionInputText({%s, %s})) produces same bounds', (_label, start, end) => {
      const inputText = getOptionInputText({ start, end });
      const range = textToTimeRange(inputText);

      expect(range.isInvalid).toBe(false);
      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
    });

    it('round-trips a preset label', () => {
      const presets = [{ label: 'Last 15 Minutes', start: 'now-15m', end: 'now' }];
      const inputText = getOptionInputText(presets[0]);
      const range = textToTimeRange(inputText, { presets });

      expect(range.isInvalid).toBe(false);
      expect(range.start).toBe('now-15m');
      expect(range.end).toBe('now');
    });

    it('round-trips named ranges', () => {
      const namedRanges: Array<{ start: string; end: string }> = [
        { start: 'now/d', end: 'now/d' },
        { start: 'now-1d/d', end: 'now-1d/d' },
        { start: 'now/w', end: 'now/w' },
      ];

      for (const bounds of namedRanges) {
        const inputText = getOptionInputText(bounds);
        const range = textToTimeRange(inputText);

        expect(range.isInvalid).toBe(false);
        expect(range.start).toBe(bounds.start);
        expect(range.end).toBe(bounds.end);
      }
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
