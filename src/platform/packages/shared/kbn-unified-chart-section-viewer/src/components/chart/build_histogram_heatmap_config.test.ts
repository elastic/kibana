/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildHistogramHeatmapConfig } from './build_histogram_heatmap_config';

const query = 'TS metrics-a | STATS count = COUNT(latency) BY bucket, TBUCKET(100)';

describe('buildHistogramHeatmapConfig', () => {
  it('builds the heatmap with the same config builder XY charts use', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        description: 'Data stream: metrics-a',
      })
    ).toEqual({
      chartType: 'heatmap',
      title: 'latency',
      description: 'Data stream: metrics-a',
      dataset: { esql: query },
      value: 'count',
      xAxis: 'TBUCKET(100)',
      breakdown: 'bucket',
      legend: { show: false },
      axisLabel: { xAxis: true, yAxis: true },
    });
  });
});
