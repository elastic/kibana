/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { percentile } from './percentile';

describe('percentile(resp, panel, series)', () => {
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
          id: 'pct',
          type: 'percentile',
          field: 'cpu',
          percentiles: [
            { id: '10-90', mode: 'band', value: 10, percentile: 90, shade: 0.2, color: '#000028' },
            { id: '50', mode: 'line', value: 50 },
          ],
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
                pct: {
                  values: {
                    '10.0': 1,
                    '50.0': 2.5,
                    '90.0': 5,
                  },
                },
              },
              {
                key: 2,
                pct: {
                  values: {
                    '10.0': 1.2,
                    '50.0': 2.7,
                    '90.0': 5.3,
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

    await percentile(resp, panel, series, {})(next)([]);

    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', async () => {
    const next = (results) => results;
    const results = await percentile(resp, panel, series, {})(next)([]);

    expect(results).toHaveLength(2);

    expect(results[0]).toHaveProperty('id', 'test╰┄►10-90');
    expect(results[0]).toHaveProperty('color', '#000028');
    expect(results[0]).toHaveProperty('label', 'Percentile of cpu');
    expect(results[0]).toHaveProperty('lines');
    expect(results[0].lines).toEqual({
      fill: 0.2,
      lineWidth: 0,
      show: true,
      mode: 'band',
    });
    expect(results[0]).toHaveProperty('points');
    expect(results[0].points).toEqual({ show: false });
    expect(results[0].data).toEqual([
      [1, 1, 5],
      [2, 1.2, 5.3],
    ]);

    expect(results[1]).toHaveProperty('id', 'test╰┄►50');
    expect(results[1]).toHaveProperty('color', 'rgb(255, 0, 0)');
    expect(results[1]).toHaveProperty('label', '(50) Percentile of cpu');
    expect(results[1]).toHaveProperty('stack', false);
    expect(results[1]).toHaveProperty('lines');
    expect(results[1].lines).toEqual({
      fill: 0,
      lineWidth: 1,
      show: true,
      steps: false,
    });
    expect(results[1]).toHaveProperty('bars');
    expect(results[1].bars).toEqual({
      fill: 0,
      lineWidth: 1,
      show: false,
    });
    expect(results[1]).toHaveProperty('points');
    expect(results[1].points).toEqual({ show: true, lineWidth: 1, radius: 1 });
    expect(results[1].data).toEqual([
      [1, 2.5],
      [2, 2.7],
    ]);
  });
});
