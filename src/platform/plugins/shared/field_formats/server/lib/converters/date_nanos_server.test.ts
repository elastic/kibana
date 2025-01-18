/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DateNanosFormat } from './date_nanos_server';
import { FieldFormatsGetConfigFn } from '../../../common';

describe('Date Nanos Format: Server side edition', () => {
  let convert: Function;
  let mockConfig: {
    dateNanosFormat: string;
    'dateFormat:tz': string;
    [other: string]: string;
  };
  let getConfig: FieldFormatsGetConfigFn;

  const dateTime = '2019-05-05T14:04:56.201900001Z';

  beforeEach(() => {
    mockConfig = {
      dateNanosFormat: 'MMMM Do YYYY, HH:mm:ss.SSSSSSSSS',
      'dateFormat:tz': 'Browser',
    };

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
