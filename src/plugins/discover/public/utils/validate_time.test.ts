/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
import { isTimeRangeValid, isRefreshIntervalValid } from './validate_time';

describe('discover validate time', () => {
  test('should validate a given time ranges correctly', async () => {
    [
      { from: '', to: '', result: false },
      { from: 'now', to: 'now+1h', result: true },
      { from: 'now', to: 'lala+1h', result: false },
      { from: '', to: 'now', result: false },
      { from: 'now', to: '', result: false },
      { from: ' 2020-06-02T13:36:13.689Z', to: 'now', result: true },
      { from: ' 2020-06-02T13:36:13.689Z', to: '2020-06-02T13:36:13.690Z', result: true },
    ].map((test) => {
      expect(isTimeRangeValid({ from: test.from, to: test.to })).toEqual(test.result);
    });
    expect(isTimeRangeValid({} as unknown as TimeRange)).toEqual(false);
    expect(isTimeRangeValid(undefined)).toEqual(false);
  });

  test('should validate that refresh interval is valid', async () => {
    expect(isRefreshIntervalValid({ value: 5000, pause: false })).toEqual(true);
    expect(isRefreshIntervalValid({ value: 0, pause: false })).toEqual(true);
    expect(isRefreshIntervalValid({ value: 4000, pause: true })).toEqual(true);
  });

  test('should validate that refresh interval is invalid', async () => {
    expect(isRefreshIntervalValid({ value: -5000, pause: false })).toEqual(false);
    expect(
      isRefreshIntervalValid({ value: 'test', pause: false } as unknown as RefreshInterval)
    ).toEqual(false);
    expect(
      isRefreshIntervalValid({ value: 4000, pause: 'test' } as unknown as RefreshInterval)
    ).toEqual(false);
    expect(isRefreshIntervalValid({} as unknown as RefreshInterval)).toEqual(false);
    expect(isRefreshIntervalValid(undefined)).toEqual(false);
  });
});
