/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { DateNanosFormat, analysePatternForFract, formatWithNanos } from './date_nanos_shared';
import type { FieldFormatsGetConfigFn } from '../types';
import { TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('Date Nanos Format', () => {
  let convert: Function;
  let date: DateNanosFormat;
  let mockConfig: {
    dateNanosFormat: string;
    'dateFormat:tz': string;
    [other: string]: string;
  };

  beforeEach(() => {
    mockConfig = {
      dateNanosFormat: 'MMMM Do YYYY, HH:mm:ss.SSSSSSSSS',
      'dateFormat:tz': 'Browser',
    };

    const getConfig: FieldFormatsGetConfigFn = (key: string) => mockConfig[key];
    date = new DateNanosFormat({}, getConfig);

    convert = date.convert.bind(date);
  });

  test('should inject fractional seconds into formatted timestamp', () => {
    [
      {
        input: '2019-05-20T14:04:56.357001234Z',
        pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        expected: 'May 20, 2019 @ 14:04:56.357001234',
      },
      {
        input: '2019-05-05T14:04:56.357111234Z',
        pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        expected: 'May 5, 2019 @ 14:04:56.357111234',
      },
      {
        input: '2019-05-05T14:04:56.357Z',
        pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        expected: 'May 5, 2019 @ 14:04:56.357000000',
      },
      {
        input: '2019-05-05T14:04:56Z',
        pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        expected: 'May 5, 2019 @ 14:04:56.000000000',
      },
      {
        input: '2019-05-05T14:04:56.201900001Z',
        pattern: 'MMM D, YYYY @ HH:mm:ss SSSS',
        expected: 'May 5, 2019 @ 14:04:56 2019',
      },
      {
        input: '2019-05-05T14:04:56.201900001Z',
        pattern: 'SSSSSSSSS',
        expected: '201900001',
      },
    ].forEach((fixture) => {
      const fracPattern = analysePatternForFract(fixture.pattern);
      const momentDate = moment(fixture.input).utc();
      const value = formatWithNanos(momentDate, fixture.input, fracPattern);
      expect(value).toBe(fixture.expected);
    });
  });

  test('decoding a missing value', () => {
    expect(convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expectReactElementWithNull(date.reactConvert(null));
    expectReactElementWithNull(date.reactConvert(undefined));
  });

  test('should clear the memoization cache after changing the date', () => {
    function setDefaultTimezone() {
      moment.tz.setDefault(mockConfig['dateFormat:tz']);
    }

    const dateTime = '2019-05-05T14:04:56.201900001Z';

    mockConfig['dateFormat:tz'] = 'America/Chicago';
    setDefaultTimezone();
    const chicagoTime = convert(dateTime, TEXT_CONTEXT_TYPE);

    mockConfig['dateFormat:tz'] = 'America/Phoenix';
    setDefaultTimezone();
    const phoenixTime = convert(dateTime, TEXT_CONTEXT_TYPE);

    expect(chicagoTime).not.toBe(phoenixTime);
  });

  test('should return the value itself when it cannot successfully be formatted', () => {
    const dateMath = 'now+1M/d';
    expect(convert(dateMath, TEXT_CONTEXT_TYPE)).toBe(dateMath);
    expect(date.reactConvert(dateMath)).toBe(dateMath);
  });

  test('returns a plain string for a valid date', () => {
    const getConfig: FieldFormatsGetConfigFn = (key: string) =>
      ({
        dateNanosFormat: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        'dateFormat:tz': 'UTC',
      }[key] as string);
    const formatter = new DateNanosFormat({}, getConfig);

    expect(
      formatter.convert('2019-05-20T14:04:56.357001234Z', TEXT_CONTEXT_TYPE)
    ).toMatchInlineSnapshot(`"May 20, 2019 @ 07:04:56.357001234"`);
    expect(formatter.reactConvert('2019-05-20T14:04:56.357001234Z')).toBe(
      'May 20, 2019 @ 07:04:56.357001234'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const getConfig: FieldFormatsGetConfigFn = (key: string) =>
      ({
        dateNanosFormat: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        'dateFormat:tz': 'UTC',
      }[key] as string);
    const formatter = new DateNanosFormat({}, getConfig);

    expect(
      formatter.convert(
        ['2019-05-20T14:04:56.357001234Z', '2020-01-01T00:00:00.000000000Z'],
        TEXT_CONTEXT_TYPE
      )
    ).toMatchInlineSnapshot(
      `"[\\"May 20, 2019 @ 07:04:56.357001234\\",\\"Dec 31, 2019 @ 17:00:00.000000000\\"]"`
    );
    expectReactElementAsArray(
      formatter.reactConvert(['2019-05-20T14:04:56.357001234Z', '2020-01-01T00:00:00.000000000Z']),
      ['May 20, 2019 @ 07:04:56.357001234', 'Dec 31, 2019 @ 17:00:00.000000000']
    );
  });

  test('returns the single element without brackets for a one-element array', () => {
    const getConfig: FieldFormatsGetConfigFn = (key: string) =>
      ({
        dateNanosFormat: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
        'dateFormat:tz': 'UTC',
      }[key] as string);
    const formatter = new DateNanosFormat({}, getConfig);

    expect(
      formatter.convert(['2019-05-20T14:04:56.357001234Z'], TEXT_CONTEXT_TYPE)
    ).toMatchInlineSnapshot(`"[\\"May 20, 2019 @ 07:04:56.357001234\\"]"`);
    expect(formatter.reactConvert(['2019-05-20T14:04:56.357001234Z'])).toBe(
      'May 20, 2019 @ 07:04:56.357001234'
    );
  });

  test('reactConvert returns raw string for unhighlighted content (React escapes at render)', () => {
    const dateNanos = new DateNanosFormat(
      {
        pattern: 'MMM D, YYYY @ HH:mm:ss.SSS',
        timezone: 'UTC',
      },
      jest.fn()
    );
    expect(dateNanos.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });
});

describe('analysePatternForFract', () => {
  test('analysePatternForFract using timestamp format containing fractional seconds', () => {
    expect(analysePatternForFract('MMM, YYYY @ HH:mm:ss.SSS')).toMatchInlineSnapshot(`
        Object {
          "length": 3,
          "pattern": "MMM, YYYY @ HH:mm:ss.SSS",
          "patternEscaped": "MMM, YYYY @ HH:mm:ss.[SSS]",
          "patternNanos": "SSS",
        }
    `);
  });

  test('analysePatternForFract using timestamp format without fractional seconds', () => {
    expect(analysePatternForFract('MMM, YYYY @ HH:mm:ss')).toMatchInlineSnapshot(`
          Object {
            "length": 0,
            "pattern": "MMM, YYYY @ HH:mm:ss",
            "patternEscaped": "",
            "patternNanos": "",
          }
      `);
  });
});
