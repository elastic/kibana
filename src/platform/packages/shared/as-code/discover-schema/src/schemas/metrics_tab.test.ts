/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-session-constants';
import { discoverSessionApiMetricsTabTypeStateSchema } from './metrics_tab';

const metricsTabTypeState = {
  type: DiscoverTabType.Metrics,
  dimensions: ['host.name'],
  search_term: 'cpu',
  counter_aggregation: 'max',
  gauge_aggregation: 'min',
  histogram_percentile: 'p99',
};

describe('discoverSessionApiMetricsTabTypeStateSchema', () => {
  it('accepts a payload without grid sort fields', () => {
    const parsed = discoverSessionApiMetricsTabTypeStateSchema.parse(metricsTabTypeState);

    expect(parsed).toStrictEqual(metricsTabTypeState);
    expect(parsed).not.toHaveProperty('grid_sort_field');
    expect(parsed).not.toHaveProperty('grid_sort_direction');
  });

  it('accepts grid sort fields', () => {
    expect(
      discoverSessionApiMetricsTabTypeStateSchema.parse({
        ...metricsTabTypeState,
        grid_sort_field: 'recency',
        grid_sort_direction: 'desc',
      })
    ).toMatchObject({ grid_sort_field: 'recency', grid_sort_direction: 'desc' });
  });

  it('rejects an unknown grid sort field', () => {
    expect(() =>
      discoverSessionApiMetricsTabTypeStateSchema.parse({
        ...metricsTabTypeState,
        grid_sort_field: 'popularity',
      })
    ).toThrow();
  });

  it('rejects an unknown grid sort direction', () => {
    expect(() =>
      discoverSessionApiMetricsTabTypeStateSchema.parse({
        ...metricsTabTypeState,
        grid_sort_direction: 'descending',
      })
    ).toThrow();
  });
});
