/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
