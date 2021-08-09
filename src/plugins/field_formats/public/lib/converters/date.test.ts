/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { DateFormat } from './date';

describe('Date Format', () => {
  let convert: Function;
  let mockConfig: Record<string, any>;

  beforeEach(() => {
    mockConfig = {};
    mockConfig.dateFormat = 'MMMM Do YYYY, HH:mm:ss.SSS';
    mockConfig['dateFormat:tz'] = 'Browser';

    const getConfig = (key: string) => mockConfig[key];

    const date = new DateFormat({}, getConfig);

    convert = date.convert.bind(date);
  });

  test('decoding an undefined or null date should return an empty string', () => {
    expect(convert(null)).toBe('-');
    expect(convert(undefined)).toBe('-');
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
