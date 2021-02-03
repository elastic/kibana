/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { seriesAgg } from './series_agg';
import { stdMetric } from './std_metric';

describe('seriesAgg(resp, panel, series)', () => {
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
      color: '#F00',
      id: 'test',
      label: 'Total CPU',
      split_mode: 'terms',
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'seriesgg',
          type: 'series_agg',
          function: 'sum',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          buckets: [
            {
              key: 'example-01',
              timeseries: {
                buckets: [
                  {
                    key: 1,
                    avgcpu: { value: 0.25 },
                  },
                  {
                    key: 2,
                    avgcpu: { value: 0.25 },
                  },
                ],
              },
            },
            {
              key: 'example-02',
              timeseries: {
                buckets: [
                  {
                    key: 1,
                    avgcpu: { value: 0.25 },
                  },
                  {
                    key: 2,
                    avgcpu: { value: 0.25 },
                  },
                ],
              },
            },
          ],
        },
      },
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await seriesAgg(resp, panel, series, {})(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', async () => {
    const next = await seriesAgg(resp, panel, series, {})((results) => results);
    const results = await stdMetric(resp, panel, series, {})(next)([]);

    expect(results).toHaveLength(1);

    expect(results[0]).toEqual({
      id: 'test',
      color: '#F00',
      label: 'Total CPU',
      stack: false,
      seriesId: 'test',
      lines: { show: true, fill: 0, lineWidth: 1, steps: false },
      points: { show: true, radius: 1, lineWidth: 1 },
      bars: { fill: 0, lineWidth: 1, show: false },
      data: [
        [1, 0.5],
        [2, 0.5],
      ],
    });
  });
});
