/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIntervalAndTimefield } from './get_interval_and_timefield';
import { FetchedIndexPattern, Panel, Series } from '../../../common/types';

describe('getIntervalAndTimefield(panel, series)', () => {
  const index: FetchedIndexPattern = {} as FetchedIndexPattern;

  test('returns the panel interval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto' } as Panel;
    const series = {} as Series;

    expect(getIntervalAndTimefield(panel, series, index)).toEqual({
      timeField: '@timestamp',
      interval: 'auto',
    });
  });

  test('returns the series interval and timefield', () => {
    const panel = { time_field: '@timestamp', interval: 'auto' } as Panel;
    const series = ({
      override_index_pattern: true,
      series_interval: '1m',
      series_time_field: 'time',
    } as unknown) as Series;

    expect(getIntervalAndTimefield(panel, series, index)).toEqual({
      timeField: 'time',
      interval: '1m',
    });
  });
});
