/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { DateFormat } from './date';
import {
  type FieldFormatsGetConfigFn,
  HTML_CONTEXT_TYPE,
  TEXT_CONTEXT_TYPE,
} from '../../../common';

describe('Date Format', () => {
  let convert: Function;
  let mockConfig: {
    dateFormat: string;
    'dateFormat:tz': string;
    [other: string]: string;
  };

  beforeEach(() => {
    mockConfig = {
      dateFormat: 'MMMM Do YYYY, HH:mm:ss.SSS',
      'dateFormat:tz': 'Browser',
    };

    const getConfig: FieldFormatsGetConfigFn = (key: string) => mockConfig[key];

    const date = new DateFormat({}, getConfig);

    convert = date.convert.bind(date);
  });

  test('decoding an undefined or null date should return an empty string', () => {
    expect(convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
  });

  test('should clear the memoization cache after changing the date', () => {
    function setDefaultTimezone() {
      moment.tz.setDefault(mockConfig['dateFormat:tz']);
    }
    const time = 1445027693942;

    mockConfig['dateFormat:tz'] = 'America/Chicago';
    setDefaultTimezone();
    const chicagoTime = convert(time);

    mockConfig['dateFormat:tz'] = 'America/Phoenix';
    setDefaultTimezone();
    const phoenixTime = convert(time);

    expect(chicagoTime).not.toBe(phoenixTime);
  });

  test('should return the value itself when it cannot successfully be formatted', () => {
    const dateMath = 'now+1M/d';
    expect(convert(dateMath)).toBe(dateMath);
  });
});
