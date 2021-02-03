/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { stdSibling } from './std_sibling';

describe('stdSibling(resp, panel, series)', () => {
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
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'sib',
          type: 'std_deviation_bucket',
          field: 'avgcpu',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          sib: {
            std_deviation: 0.23,
          },
          timeseries: {
            buckets: [
              {
                key: 1,
                avgcpu: { value: 0.23 },
              },
              {
                key: 2,
                avgcpu: { value: 0.22 },
              },
            ],
          },
        },
      },
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await stdSibling(resp, panel, series, {})(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('calls next when std. deviation bands set', async () => {
    series.metrics[1].mode = 'band';
    const next = jest.fn((results) => results);
    const results = await stdSibling(resp, panel, series, {})(next)([]);
    expect(next.mock.calls.length).toEqual(1);
    expect(results).toHaveLength(0);
  });

  test('creates a series', async () => {
    const next = (results) => results;
    const results = await stdSibling(resp, panel, series, {})(next)([]);
    expect(results).toHaveLength(1);

    expect(results[0]).toEqual({
      id: 'test',
      label: 'Overall Std. Deviation of Average of cpu',
      color: 'rgb(255, 0, 0)',
      stack: false,
      seriesId: 'test',
      lines: { show: true, fill: 0, lineWidth: 1, steps: false },
      points: { show: true, radius: 1, lineWidth: 1 },
      bars: { fill: 0, lineWidth: 1, show: false },
      data: [
        [1, 0.23],
        [2, 0.23],
      ],
    });
  });
});
