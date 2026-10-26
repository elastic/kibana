/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRICS_GRID_SETTINGS_DEFAULTS, type MetricsGridSettings } from '@kbn/discover-utils';
import { getAggregationConfigChanges } from './get_aggregation_config_changes';

const gridSettings: MetricsGridSettings = {
  ...METRICS_GRID_SETTINGS_DEFAULTS,
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

describe('getAggregationConfigChanges', () => {
  it('maps changed settings to their metric types and aggregation values', () => {
    expect(
      getAggregationConfigChanges(gridSettings, {
        counterAggregation: 'max',
        gaugeAggregation: 'min',
        histogramPercentile: 'p99',
      })
    ).toEqual([
      {
        metric_type: 'counter',
        previous_aggregation: 'sum',
        new_aggregation: 'max',
      },
      {
        metric_type: 'gauge',
        previous_aggregation: 'avg',
        new_aggregation: 'min',
      },
      {
        metric_type: 'histogram',
        previous_aggregation: 'p95',
        new_aggregation: 'p99',
        previous_visualization: 'lnsXY',
        new_visualization: 'lnsXY',
      },
    ]);
  });

  it('reports the chart change and keeps the percentile as the type', () => {
    expect(
      getAggregationConfigChanges(gridSettings, {
        histogramVisualization: 'lnsHeatmap',
      })
    ).toEqual([
      {
        metric_type: 'histogram',
        previous_aggregation: 'p95',
        new_aggregation: 'p95',
        previous_visualization: 'lnsXY',
        new_visualization: 'lnsHeatmap',
      },
    ]);
  });

  it('reports a percentile fallback change while the heatmap stays selected', () => {
    expect(
      getAggregationConfigChanges(
        { ...gridSettings, histogramVisualization: 'lnsHeatmap' },
        { histogramPercentile: 'p50' }
      )
    ).toEqual([
      {
        metric_type: 'histogram',
        previous_aggregation: 'p95',
        new_aggregation: 'p50',
        previous_visualization: 'lnsHeatmap',
        new_visualization: 'lnsHeatmap',
      },
    ]);
  });

  it('ignores missing settings', () => {
    expect(
      getAggregationConfigChanges(gridSettings, {
        counterAggregation: undefined,
      })
    ).toEqual([]);
  });
});
