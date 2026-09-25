/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDateHistogramSerializedFormat } from './date_histogram_to_esql';

jest.mock('@kbn/data-plugin/common', () => ({
  ...jest.requireActual('@kbn/data-plugin/common'),
  // Return a fixed 20-minute duration so the PT1M rule selects 'HH:mm' (a time-only format).
  getCalculateAutoTimeExpression: () => () => ({ asMilliseconds: () => 20 * 60 * 1000 }),
}));

const scaledRules: Array<[string, string]> = [
  ['', 'HH:mm:ss.SSS'],
  ['PT1S', 'HH:mm:ss'],
  ['PT1M', 'HH:mm'],
  ['PT1H', 'YYYY-MM-DD HH:mm'],
  ['P1DT', 'YYYY-MM-DD'],
  ['P1YT', 'YYYY'],
];

function makeUiSettings(tz: string) {
  return {
    get: (key: string) => {
      if (key === 'dateFormat') return 'YYYY-MM-DD';
      if (key === 'dateFormat:scaled') return scaledRules;
      if (key === 'dateFormat:tz') return tz;
    },
  } as any;
}

const indexPattern = { getFieldByName: () => undefined } as any;

const column = {
  sourceField: '@timestamp',
  params: { interval: '20m' },
} as any;

describe('getDateHistogramSerializedFormat', () => {
  test('prepends date when range spans multiple calendar days (UTC)', () => {
    // 23:00–01:00 UTC crosses midnight in UTC.
    const result = getDateHistogramSerializedFormat(
      column,
      column,
      indexPattern,
      makeUiSettings('UTC'),
      { fromDate: '2020-03-25T23:00:00.000Z', toDate: '2020-03-26T01:00:00.000Z' }
    );
    expect(result).toEqual({ id: 'date', params: { pattern: 'YYYY-MM-DD HH:mm' } });
  });

  test('does not prepend date when range is within same calendar day (UTC)', () => {
    // 00:00–23:00 UTC stays on the same UTC day.
    const result = getDateHistogramSerializedFormat(
      column,
      column,
      indexPattern,
      makeUiSettings('UTC'),
      { fromDate: '2020-03-25T00:00:00.000Z', toDate: '2020-03-25T23:00:00.000Z' }
    );
    expect(result).toEqual({ id: 'date', params: { pattern: 'HH:mm' } });
  });

  test('prepends date when range crosses midnight only in the configured timezone', () => {
    // 06:30–07:30 UTC is one UTC day, but is 23:30–00:30 in America/Los_Angeles (UTC-7).
    const result = getDateHistogramSerializedFormat(
      column,
      column,
      indexPattern,
      makeUiSettings('America/Los_Angeles'),
      { fromDate: '2023-06-16T06:30:00.000Z', toDate: '2023-06-16T07:30:00.000Z' }
    );
    expect(result).toEqual({ id: 'date', params: { pattern: 'YYYY-MM-DD HH:mm' } });
  });

  test('does not prepend date when range stays within one calendar day in the configured timezone', () => {
    // 14:00–23:00 UTC is 07:00–16:00 in America/Los_Angeles — same calendar day.
    const result = getDateHistogramSerializedFormat(
      column,
      column,
      indexPattern,
      makeUiSettings('America/Los_Angeles'),
      { fromDate: '2023-06-16T14:00:00.000Z', toDate: '2023-06-16T23:00:00.000Z' }
    );
    expect(result).toEqual({ id: 'date', params: { pattern: 'HH:mm' } });
  });

  test('prepends date when format uses kk (1-24 hour) and range crosses midnight', () => {
    const rulesWithKk: Array<[string, string]> = [...scaledRules.slice(0, 2), ['PT1M', 'kk:mm']];
    const settingsWithKk = {
      get: (key: string) => {
        if (key === 'dateFormat') return 'YYYY-MM-DD';
        if (key === 'dateFormat:scaled') return rulesWithKk;
        if (key === 'dateFormat:tz') return 'UTC';
      },
    } as any;
    const result = getDateHistogramSerializedFormat(column, column, indexPattern, settingsWithKk, {
      fromDate: '2020-03-25T23:00:00.000Z',
      toDate: '2020-03-26T01:00:00.000Z',
    });
    expect(result).toEqual({ id: 'date', params: { pattern: 'YYYY-MM-DD kk:mm' } });
  });

  test('does not prepend date when format already contains a date token', () => {
    const rulesWithDate: Array<[string, string]> = [
      ...scaledRules.slice(0, 2),
      ['PT1M', 'YYYY-MM-DD HH:mm'],
    ];
    const settingsWithDate = {
      get: (key: string) => {
        if (key === 'dateFormat') return 'YYYY-MM-DD';
        if (key === 'dateFormat:scaled') return rulesWithDate;
        if (key === 'dateFormat:tz') return 'UTC';
      },
    } as any;
    // Crosses midnight — but the format already carries a date, so no double-prefix.
    const result = getDateHistogramSerializedFormat(
      column,
      column,
      indexPattern,
      settingsWithDate,
      { fromDate: '2020-03-25T23:00:00.000Z', toDate: '2020-03-26T01:00:00.000Z' }
    );
    expect(result).toEqual({ id: 'date', params: { pattern: 'YYYY-MM-DD HH:mm' } });
  });
});
