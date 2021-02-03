/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { stdMetric } from './std_metric';

describe('stdMetric(resp, panel, series)', () => {
  let panel;
  let series;
  let resp;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
    };
    series = {
      chart_type: 'line',
      stacked: false,
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: 'rgb(255, 0, 0)',
      id: 'test',
      split_mode: 'everything',
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }],
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                avgmetric: { value: 1 },
              },
              {
                key: 2,
                avgmetric: { value: 2 },
              },
            ],
          },
        },
      },
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await stdMetric(resp, panel, series, {})(next)([]);

    expect(next.mock.calls.length).toEqual(1);
  });

  test('calls next when finished (percentile)', async () => {
    series.metrics[0].type = 'percentile';

    const next = jest.fn((d) => d);
    const results = await stdMetric(resp, panel, series, {})(next)([]);

    expect(next.mock.calls.length).toEqual(1);
    expect(results).toHaveLength(0);
  });

  test('calls next when finished (std_deviation band)', async () => {
    series.metrics[0].type = 'std_deviation';
    series.metrics[0].mode = 'band';

    const next = jest.fn((d) => d);
    const results = await stdMetric(resp, panel, series, {})(next)([]);

    expect(next.mock.calls.length).toEqual(1);
    expect(results).toHaveLength(0);
  });

  test('creates a series', async () => {
    const next = (results) => results;
    const results = await stdMetric(resp, panel, series, {})(next)([]);

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('color', 'rgb(255, 0, 0)');
    expect(results[0]).toHaveProperty('id', 'test');
    expect(results[0]).toHaveProperty('label', 'Average of cpu');
    expect(results[0]).toHaveProperty('lines');
    expect(results[0]).toHaveProperty('stack');
    expect(results[0]).toHaveProperty('bars');
    expect(results[0]).toHaveProperty('points');
    expect(results[0].data).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});
