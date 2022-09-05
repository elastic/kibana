/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric } from '../../../../common/types';
import { getPercentilesSeries, getPercentileRankSeries } from './metrics_helpers';

describe('getPercentilesSeries', () => {
  test('should return correct config for multiple percentiles', () => {
    const percentiles = [
      {
        color: '#68BC00',
        id: 'aef159f0-7db8-11ec-9d0c-e57521cec076',
        mode: 'line',
        shade: 0.2,
        value: 50,
      },
      {
        color: 'rgba(0,63,188,1)',
        id: 'b0e0a6d0-7db8-11ec-9d0c-e57521cec076',
        mode: 'line',
        percentile: '',
        shade: 0.2,
        value: '70',
      },
      {
        color: 'rgba(188,38,0,1)',
        id: 'b2e04760-7db8-11ec-9d0c-e57521cec076',
        mode: 'line',
        percentile: '',
        shade: 0.2,
        value: '80',
      },
      {
        color: 'rgba(188,0,3,1)',
        id: 'b503eab0-7db8-11ec-9d0c-e57521cec076',
        mode: 'line',
        percentile: '',
        shade: 0.2,
        value: '90',
      },
    ] as Metric['percentiles'];
    const config = getPercentilesSeries(percentiles, 'everything', '', 'bytes');
    expect(config).toStrictEqual([
      {
        agg: 'percentile',
        color: '#68BC00',
        fieldName: 'bytes',
        isFullReference: false,
        params: { percentile: 50 },
      },
      {
        agg: 'percentile',
        color: 'rgba(0,63,188,1)',
        fieldName: 'bytes',
        isFullReference: false,
        params: { percentile: '70' },
      },
      {
        agg: 'percentile',
        color: 'rgba(188,38,0,1)',
        fieldName: 'bytes',
        isFullReference: false,
        params: { percentile: '80' },
      },
      {
        agg: 'percentile',
        color: 'rgba(188,0,3,1)',
        fieldName: 'bytes',
        isFullReference: false,
        params: { percentile: '90' },
      },
    ]);
  });
});

describe('getPercentileRankSeries', () => {
  test('should return correct config for multiple percentile ranks', () => {
    const values = ['1', '5', '7'] as Metric['values'];
    const colors = ['#68BC00', 'rgba(0,63,188,1)', 'rgba(188,38,0,1)'] as Metric['colors'];
    const config = getPercentileRankSeries(values, colors, 'everything', '', 'day_of_week_i');
    expect(config).toStrictEqual([
      {
        agg: 'percentile_rank',
        color: '#68BC00',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: { value: '1' },
      },
      {
        agg: 'percentile_rank',
        color: 'rgba(0,63,188,1)',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: { value: '5' },
      },
      {
        agg: 'percentile_rank',
        color: 'rgba(188,38,0,1)',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: { value: '7' },
      },
    ]);
  });
});
