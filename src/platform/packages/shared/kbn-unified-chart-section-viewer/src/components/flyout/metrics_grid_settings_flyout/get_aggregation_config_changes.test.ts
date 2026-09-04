/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsGridSettings } from '@kbn/discover-utils';
import { getAggregationConfigChanges } from './get_aggregation_config_changes';

const gridSettings: MetricsGridSettings = {
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
