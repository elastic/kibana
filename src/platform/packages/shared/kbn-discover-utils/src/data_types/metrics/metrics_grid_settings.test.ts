/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_HISTOGRAM_PERCENTILES,
  METRICS_GRID_SIMPLE_AGGREGATIONS,
} from './metrics_grid_settings';

describe('metrics grid settings', () => {
  it('exposes exactly the four simple aggregation options', () => {
    expect(METRICS_GRID_SIMPLE_AGGREGATIONS).toEqual(['avg', 'sum', 'min', 'max']);
  });

  it('exposes exactly the five histogram percentile options', () => {
    expect(METRICS_GRID_HISTOGRAM_PERCENTILES).toEqual(['p50', 'p75', 'p90', 'p95', 'p99']);
  });
});
