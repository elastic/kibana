/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NULL_LABEL } from '@kbn/field-formats-common';
import { DateFormat } from './date_server';
import type { FieldFormatsGetConfigFn } from '../../../common';

describe('Date Format: Server side edition', () => {
  let mockConfig: {
    dateFormat: string;
    'dateFormat:tz': string;
    [other: string]: string;
  };
  let getConfig: FieldFormatsGetConfigFn;

  const dateTime = '2019-05-05T14:04:56.201Z';

  beforeEach(() => {
    mockConfig = {
      dateFormat: 'MMMM Do YYYY, HH:mm:ss.SSS',
      'dateFormat:tz': 'Browser',
    };

    getConfig = (key: string) => mockConfig[key];
  });

  test('should format according to the given timezone parameter', () => {
    const date = new DateFormat({ timezone: 'America/Phoenix' }, getConfig);
    expect(date.textConvert(dateTime)).toBe('May 5th 2019, 07:04:56.201');
  });

  test('should format according to UTC if no timezone parameter is given or exists in settings', () => {
    const utcFormat = 'May 5th 2019, 14:04:56.201';
    const dateUtc = new DateFormat({ timezone: 'UTC' }, getConfig);
    expect(dateUtc.textConvert(dateTime)).toBe(utcFormat);

    const dateDefault = new DateFormat({}, getConfig);
    expect(dateDefault.textConvert(dateTime)).toBe(utcFormat);
  });

  test('should format missing values with the shared null label, like the client formatter', () => {
    const date = new DateFormat({ timezone: 'UTC' }, getConfig);
    expect(date.textConvert(null)).toBe(NULL_LABEL);
    expect(date.textConvert(undefined)).toBe(NULL_LABEL);
  });
});
