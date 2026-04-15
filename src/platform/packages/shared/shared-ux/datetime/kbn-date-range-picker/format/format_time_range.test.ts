/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { textToTimeRange } from '../parse';
import {
  timeRangeToDisplayText,
  timeRangeToFullFormattedText,
  applyTimePrecision,
} from './format_time_range';

describe('applyTimePrecision', () => {
  it('keeps everything for ms', () => {
    expect(applyTimePrecision('MMM D, YYYY, HH:mm:ss.SSS', 'ms')).toBe('MMM D, YYYY, HH:mm:ss.SSS');
  });

  it('strips milliseconds for s', () => {
    expect(applyTimePrecision('MMM D, YYYY, HH:mm:ss.SSS', 's')).toBe('MMM D, YYYY, HH:mm:ss');
    expect(applyTimePrecision('HH:mm:ss.SSS', 's')).toBe('HH:mm:ss');
  });

  it('strips seconds and milliseconds for none', () => {
    expect(applyTimePrecision('MMM D, YYYY, HH:mm:ss.SSS', 'none')).toBe('MMM D, YYYY, HH:mm');
    expect(applyTimePrecision('HH:mm:ss.SSS', 'none')).toBe('HH:mm');
    expect(applyTimePrecision('HH:mm:ss', 'none')).toBe('HH:mm');
  });

  it('defaults to s when no precision is given', () => {
    expect(applyTimePrecision('HH:mm:ss.SSS')).toBe('HH:mm:ss');
  });
});

describe('timeRangeToDisplayText', () => {
  const toDisplay = (text: string, options?: Parameters<typeof timeRangeToDisplayText>[1]) =>
    timeRangeToDisplayText(textToTimeRange(text), options);

  it('handles relative to relative', () => {
    expect(toDisplay('-15m to -5m')).toBe('15 minutes ago → 5 minutes ago');
  });

  it('handles relative to now', () => {
    expect(toDisplay('-1w')).toBe('Last 1 week');
  });

  it('handles now to relative', () => {
    expect(toDisplay('now to +15m')).toBe('Next 15 minutes');
  });

  it('handles absolute to absolute', () => {
    expect(toDisplay('Feb 3 2016, 19:00 to Feb 3 2026, 19:00')).toBe(
      'Feb 3, 2016, 19:00:00 → Feb 3, 2026, 19:00:00'
    );
  });

  it('handles absolute to now', () => {
    expect(toDisplay('Feb 3 2016 to now')).toBe('Feb 3, 2016, 00:00:00 → now');
  });

  it('handles now to absolute', () => {
    expect(toDisplay('now to Feb 3 2027')).toBe('now → Feb 3, 2027, 00:00:00');
  });

  it('handles relative to absolute', () => {
    jest.useFakeTimers().setSystemTime(new Date('2016-02-03T19:00:00.000Z'));
    expect(toDisplay('-15m to feb 3 2026, 19:00')).toBe('15 minutes ago → Feb 3, 2026, 19:00:00');
    jest.useRealTimers();
  });

  it('handles absolute to relative', () => {
    jest.useFakeTimers().setSystemTime(new Date('2016-02-03T19:00:00.000Z'));
    expect(toDisplay('feb 3 2016, 19:00 to +10y')).toBe(
      'Feb 3, 2016, 19:00:00 → 10 years from now'
    );
    jest.useRealTimers();
  });

  it('keeps natural language, capitalized', () => {
    expect(timeRangeToDisplayText(textToTimeRange('last 7 minutes'))).toBe('Last 7 minutes');
  });

  it('resolves named range aliases to their canonical name', () => {
    expect(timeRangeToDisplayText(textToTimeRange('td'))).toBe('Today');
    expect(timeRangeToDisplayText(textToTimeRange('yd'))).toBe('Yesterday');
    expect(timeRangeToDisplayText(textToTimeRange('tmr'))).toBe('Tomorrow');
  });

  it.todo('uses abbreviations for absolute dates, with default format');

  it('supports a custom delimiter', () => {
    expect(toDisplay('-15m to -5m', { delimiter: 'until' })).toBe(
      '15 minutes ago until 5 minutes ago'
    );
  });

  it('supports a custom date format', () => {
    expect(toDisplay('feb 3, 2016 to feb 3, 2026', { dateFormat: 'YYYY' })).toBe('2016 → 2026');
  });

  it('returns raw text for invalid ranges', () => {
    const invalidRange = textToTimeRange('not a range');

    expect(timeRangeToDisplayText(invalidRange)).toBe('not a range');
  });

  describe('timePrecision', () => {
    it('shows milliseconds with ms', () => {
      expect(toDisplay('Feb 3 2016 to now', { timePrecision: 'ms' })).toBe(
        'Feb 3, 2016, 00:00:00.000 → now'
      );
    });

    it('shows seconds with s (default)', () => {
      expect(toDisplay('Feb 3 2016 to now')).toBe('Feb 3, 2016, 00:00:00 → now');
    });

    it('shows only minutes with none', () => {
      expect(toDisplay('Feb 3 2016 to now', { timePrecision: 'none' })).toBe(
        'Feb 3, 2016, 00:00 → now'
      );
    });
  });
});

describe('timeRangeToFullFormattedText', () => {
  const toFullFormatted = (
    text: string,
    options?: Parameters<typeof timeRangeToFullFormattedText>[1]
  ) => timeRangeToFullFormattedText(textToTimeRange(text), options);

  it('formats absolute to absolute with full date format (defaults to ms precision)', () => {
    expect(toFullFormatted('Feb 3 2016, 19:00 to Feb 3 2026, 19:00')).toBe(
      'Feb 3, 2016, 19:00:00.000 → Feb 3, 2026, 19:00:00.000'
    );
  });

  it('resolves relative dates to absolute formatted dates', () => {
    // Use local-time constructor to avoid timezone offset in assertions
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 11, 12, 0, 0));
    expect(toFullFormatted('-7d to now')).toBe(
      'Feb 4, 2026, 12:00:00.000 → Feb 11, 2026, 12:00:00.000'
    );
    jest.useRealTimers();
  });

  it('resolves both relative dates to absolute formatted dates', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 11, 12, 0, 0));
    expect(toFullFormatted('-1h to +1h')).toBe(
      'Feb 11, 2026, 11:00:00.000 → Feb 11, 2026, 13:00:00.000'
    );
    jest.useRealTimers();
  });

  it('returns raw text for invalid ranges', () => {
    expect(toFullFormatted('not a range')).toBe('not a range');
  });

  it('supports a custom delimiter', () => {
    expect(toFullFormatted('Feb 3 2016 to Feb 3 2026', { delimiter: '—' })).toBe(
      'Feb 3, 2016, 00:00:00.000 — Feb 3, 2026, 00:00:00.000'
    );
  });

  it('supports a custom date format', () => {
    expect(toFullFormatted('Feb 3 2016 to Feb 3 2026', { dateFormat: 'YYYY-MM-DD' })).toBe(
      '2016-02-03 → 2026-02-03'
    );
  });
});
