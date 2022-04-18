/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggConfigs } from '@kbn/data-plugin/public';
import type { SeriesParam } from '../types';
import { getSeriesParams } from './get_series_params';
import { sampleAreaVis } from '../sample_vis.test.mocks';

describe('getSeriesParams', () => {
  it('returns correct params', () => {
    const seriesParams = getSeriesParams(
      sampleAreaVis.data.aggs as unknown as AggConfigs,
      sampleAreaVis.params.seriesParams as unknown as SeriesParam[],
      'metric',
      'ValueAxis-1'
    );
    expect(seriesParams).toStrictEqual([
      {
        circlesRadius: 5,
        data: {
          id: '1',
          label: 'Total quantity',
        },
        drawLinesBetweenPoints: true,
        interpolate: 'linear',
        mode: 'stacked',
        show: 'true',
        showCircles: true,
        type: 'area',
        valueAxis: 'ValueAxis-1',
      },
    ]);
  });

  it('returns default params if no params provided', () => {
    const seriesParams = getSeriesParams(
      sampleAreaVis.data.aggs as unknown as AggConfigs,
      [],
      'metric',
      'ValueAxis-1'
    );
    expect(seriesParams).toStrictEqual([
      {
        circlesRadius: 1,
        data: {
          id: '1',
          label: 'Total quantity',
        },
        drawLinesBetweenPoints: true,
        interpolate: 'linear',
        lineWidth: 2,
        mode: 'normal',
        show: true,
        showCircles: true,
        type: 'line',
        valueAxis: 'ValueAxis-1',
      },
    ]);
  });
});
