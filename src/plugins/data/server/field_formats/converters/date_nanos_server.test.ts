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

import { DateNanosFormat } from './date_nanos_server';
import { FieldFormatsGetConfigFn } from 'src/plugins/data/common';

describe('Date Nanos Format: Server side edition', () => {
  let convert: Function;
  let mockConfig: Record<string, any>;
  let getConfig: FieldFormatsGetConfigFn;

  const dateTime = '2019-05-05T14:04:56.201900001Z';

  beforeEach(() => {
    mockConfig = {};
    mockConfig.dateNanosFormat = 'MMMM Do YYYY, HH:mm:ss.SSSSSSSSS';
    mockConfig['dateFormat:tz'] = 'Browser';

    getConfig = (key: string) => mockConfig[key];
  });

  test('should format according to the given timezone parameter', () => {
    const dateNy = new DateNanosFormat({ timezone: 'America/New_York' }, getConfig);
    convert = dateNy.convert.bind(dateNy);
    expect(convert(dateTime)).toMatchInlineSnapshot(`"May 5th 2019, 10:04:56.201900001"`);

    const datePhx = new DateNanosFormat({ timezone: 'America/Phoenix' }, getConfig);
    convert = datePhx.convert.bind(datePhx);
    expect(convert(dateTime)).toMatchInlineSnapshot(`"May 5th 2019, 07:04:56.201900001"`);
  });

  test('should format according to UTC if no timezone parameter is given or exists in settings', () => {
    const utcFormat = 'May 5th 2019, 14:04:56.201900001';
    const dateUtc = new DateNanosFormat({ timezone: 'UTC' }, getConfig);
    convert = dateUtc.convert.bind(dateUtc);
    expect(convert(dateTime)).toBe(utcFormat);

    const dateDefault = new DateNanosFormat({}, getConfig);
    convert = dateDefault.convert.bind(dateDefault);
    expect(convert(dateTime)).toBe(utcFormat);
  });

  test('should format according to dateFormat:tz if the setting is not "Browser"', () => {
    mockConfig['dateFormat:tz'] = 'America/Phoenix';

    const date = new DateNanosFormat({}, getConfig);
    convert = date.convert.bind(date);
    expect(convert(dateTime)).toMatchInlineSnapshot(`"May 5th 2019, 07:04:56.201900001"`);
  });

  test('should defer to meta params for timezone, not the UI config', () => {
    mockConfig['dateFormat:tz'] = 'America/Phoenix';

    const date = new DateNanosFormat({ timezone: 'America/New_York' }, getConfig);
    convert = date.convert.bind(date);
    expect(convert(dateTime)).toMatchInlineSnapshot(`"May 5th 2019, 10:04:56.201900001"`);
  });
});
