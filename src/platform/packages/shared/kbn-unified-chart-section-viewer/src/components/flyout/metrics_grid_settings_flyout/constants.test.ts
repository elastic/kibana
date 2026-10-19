/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_HISTOGRAM_VISUALIZATIONS,
  METRICS_GRID_SETTINGS_DEFAULTS,
  METRICS_GRID_SIMPLE_AGGREGATIONS,
} from '@kbn/discover-utils';
import {
  HISTOGRAM_PERCENTILE_VALUES,
  HISTOGRAM_VISUALIZATION_OPTIONS,
  isDistributionVisualization,
  SIMPLE_AGGREGATION_OPTIONS,
  toSeriesPercentile,
} from './constants';

describe('grid_settings constants', () => {
  it('exposes defaults matching the pre-existing hardcoded aggregation behavior', () => {
    expect(METRICS_GRID_SETTINGS_DEFAULTS).toEqual({
      counterAggregation: 'sum',
      gaugeAggregation: 'avg',
      histogramPercentile: 'p95',
      dimensions: [],
      searchTerm: '',
    });
  });

  it('uses the canonical simple aggregation options', () => {
    expect(SIMPLE_AGGREGATION_OPTIONS).toBe(METRICS_GRID_SIMPLE_AGGREGATIONS);
  });

  it('uses the canonical histogram visualization options', () => {
    expect(HISTOGRAM_VISUALIZATION_OPTIONS).toBe(METRICS_GRID_HISTOGRAM_VISUALIZATIONS);
  });

  it('maps every histogram percentile option to its numeric value', () => {
    expect(HISTOGRAM_PERCENTILE_VALUES).toEqual({
      p50: 50,
      p75: 75,
      p90: 90,
      p95: 95,
      p99: 99,
    });
  });

  it('maps distribution to the series fallback and leaves numeric percentiles unchanged', () => {
    expect(toSeriesPercentile('distribution')).toBe('p95');
    expect(toSeriesPercentile('p99')).toBe('p99');
    expect(isDistributionVisualization('distribution')).toBe(true);
    expect(isDistributionVisualization('p95')).toBe(false);
  });
});
