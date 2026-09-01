/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/discover-utils';
import { getAggregationLabel } from './get_aggregation_label';

describe('getAggregationLabel', () => {
  it('returns an empty string when no grid settings are provided', () => {
    expect(getAggregationLabel({ instrument: 'gauge' })).toBe('');
  });

  it('returns the gauge aggregation label for gauge metrics', () => {
    expect(
      getAggregationLabel({ instrument: 'gauge', gridSettings: METRICS_GRID_SETTINGS_DEFAULTS })
    ).toBe('Avg');
  });

  it('returns the counter aggregation label for counter metrics', () => {
    expect(
      getAggregationLabel({ instrument: 'counter', gridSettings: METRICS_GRID_SETTINGS_DEFAULTS })
    ).toBe('Sum');
  });

  it('reflects a tab-specific gauge aggregation from grid settings', () => {
    expect(
      getAggregationLabel({
        instrument: 'gauge',
        gridSettings: { ...METRICS_GRID_SETTINGS_DEFAULTS, gaugeAggregation: 'max' },
      })
    ).toBe('Max');
  });

  it('reflects a tab-specific counter aggregation from grid settings', () => {
    expect(
      getAggregationLabel({
        instrument: 'counter',
        gridSettings: { ...METRICS_GRID_SETTINGS_DEFAULTS, counterAggregation: 'min' },
      })
    ).toBe('Min');
  });

  it('returns the percentile label for histogram metrics', () => {
    expect(
      getAggregationLabel({ instrument: 'histogram', gridSettings: METRICS_GRID_SETTINGS_DEFAULTS })
    ).toBe('95th percentile');
  });

  it('reflects a tab-specific histogram percentile from grid settings', () => {
    expect(
      getAggregationLabel({
        instrument: 'histogram',
        gridSettings: { ...METRICS_GRID_SETTINGS_DEFAULTS, histogramPercentile: 'p99' },
      })
    ).toBe('99th percentile');
  });

  it('returns the custom function name when a custom function is used', () => {
    expect(
      getAggregationLabel({
        instrument: 'counter',
        customFunction: 'COUNT',
        gridSettings: METRICS_GRID_SETTINGS_DEFAULTS,
      })
    ).toBe('COUNT');
  });
});
