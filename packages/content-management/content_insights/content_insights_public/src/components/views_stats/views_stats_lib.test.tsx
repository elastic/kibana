/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { getChartData, getTotalDays } from './views_stats';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-07-15T14:00:00.00Z'));
  moment.updateLocale('en', {
    week: {
      dow: 1, // test with Monday is the first day of the week.
    },
  });
});
afterEach(() => jest.clearAllMocks());
afterAll(() => jest.useRealTimers());

describe('getTotalDays', () => {
  test('should return the total days between the current date and the from date', () => {
    const totalDays = getTotalDays({
      from: '2024-07-01T00:00:00.000Z',
      daily: [],
      count: 0,
    });
    expect(totalDays).toBe(14);
  });
});

describe('getChartData', () => {
  test('should return views bucketed by week', () => {
    const data = getChartData({
      from: '2024-05-01T00:00:00.000Z',
      daily: [],
      count: 0,
    });
    expect(data.every(([, count]) => count === 0)).toBe(true);

    // moment is mocked with America/New_York timezone, hence +04:00 offset
    expect(data.map((d) => new Date(d[0]).toISOString())).toMatchInlineSnapshot(`
      Array [
        "2024-05-06T04:00:00.000Z",
        "2024-05-13T04:00:00.000Z",
        "2024-05-20T04:00:00.000Z",
        "2024-05-27T04:00:00.000Z",
        "2024-06-03T04:00:00.000Z",
        "2024-06-10T04:00:00.000Z",
        "2024-06-17T04:00:00.000Z",
        "2024-06-24T04:00:00.000Z",
        "2024-07-01T04:00:00.000Z",
        "2024-07-08T04:00:00.000Z",
        "2024-07-15T04:00:00.000Z",
      ]
    `);
  });
});
