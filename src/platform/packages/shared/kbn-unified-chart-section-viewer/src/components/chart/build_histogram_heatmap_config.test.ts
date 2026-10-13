/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HISTOGRAM_HEATMAP_PALETTE,
  buildHistogramHeatmapConfig,
} from './build_histogram_heatmap_config';
import { getHeatmapValueFormat } from '../../common/utils/metric_unit/get_heatmap_value_format';

const query = 'TS metrics-a | STATS count = COUNT(latency) BY bucket, TBUCKET(100)';

describe('buildHistogramHeatmapConfig', () => {
  it('builds the Lens API heatmap with the distribution defaults', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        description: 'from metrics-a',
        valueFormat: getHeatmapValueFormat('ms'),
      })
    ).toEqual({
      type: 'heatmap',
      title: 'latency',
      description: 'from metrics-a',
      sampling: 1,
      ignore_global_filters: false,
      data_source: { type: 'esql', query },
      metric: {
        column: 'count',
        label: 'Count',
        format: { type: 'number', compact: true, decimals: 0 },
        color: { type: 'distributed_palette', palette: HISTOGRAM_HEATMAP_PALETTE },
      },
      x: { column: 'TBUCKET(100)', label: 'Time' },
      y: {
        column: 'bucket',
        label: 'Value',
        format: { type: 'duration', from: 'ms', to: 'auto', decimals: 0 },
      },
      axis: {
        x: {
          labels: { visible: true },
          title: { visible: false },
          scale: 'temporal',
        },
        y: {
          labels: { visible: true },
          title: { visible: false },
          sort: 'asc',
        },
      },
      legend: { visibility: 'hidden', position: 'right' },
      styling: { cells: { labels: { visible: false } } },
    });
  });

  it('omits the value format when the unit is not a supported scale', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
      }).y
    ).toEqual({ column: 'bucket', label: 'Value' });
  });
});
