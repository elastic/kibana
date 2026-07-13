/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_SETTINGS_DEFAULTS,
  SIMPLE_AGGREGATION_OPTIONS,
  HISTOGRAM_PERCENTILE_OPTIONS,
  HISTOGRAM_PERCENTILE_VALUES,
} from './constants';

describe('grid_settings constants', () => {
  it('exposes defaults matching the pre-existing hardcoded aggregation behavior', () => {
    expect(METRICS_GRID_SETTINGS_DEFAULTS).toEqual({
      counterAggregation: 'sum',
      gaugeAggregation: 'avg',
      histogramPercentile: 'p95',
    });
  });

  it('exposes exactly the four simple aggregation options', () => {
    expect(SIMPLE_AGGREGATION_OPTIONS).toEqual(['avg', 'sum', 'min', 'max']);
  });

  it('exposes exactly the five histogram percentile options', () => {
    expect(HISTOGRAM_PERCENTILE_OPTIONS).toEqual(['p50', 'p75', 'p90', 'p95', 'p99']);
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
});
