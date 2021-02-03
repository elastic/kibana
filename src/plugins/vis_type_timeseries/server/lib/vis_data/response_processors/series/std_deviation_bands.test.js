/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { stdDeviationBands } from './std_deviation_bands';

describe('stdDeviationBands(resp, panel, series)', () => {
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
          id: 'stddev',
          mode: 'band',
          type: 'std_deviation',
          field: 'cpu',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                stddev: {
                  std_deviation: 1.2,
                  std_deviation_bounds: {
                    upper: 3.2,
                    lower: 0.2,
                  },
                },
              },
              {
                key: 2,
                stddev: {
                  std_deviation_bands: 1.5,
                  std_deviation_bounds: {
                    upper: 3.5,
                    lower: 0.5,
                  },
                },
              },
            ],
          },
        },
      },
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await stdDeviationBands(resp, panel, series, {})(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', async () => {
    const next = (results) => results;
    const results = await stdDeviationBands(resp, panel, series, {})(next)([]);
    expect(results).toHaveLength(1);

    expect(results[0]).toEqual({
      id: 'test',
      label: 'Std. Deviation of cpu',
      color: 'rgb(255, 0, 0)',
      lines: { show: true, fill: 0.5, lineWidth: 0, mode: 'band' },
      bars: { show: false, fill: 0.5, mode: 'band' },
      points: { show: false },
      data: [
        [1, 3.2, 0.2],
        [2, 3.5, 0.5],
      ],
    });
  });
});
