/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error no typed yet
import { percentileRank } from './percentile_rank';
import type { Panel, Series } from '../../../../../common/types';

describe('percentile_rank(resp, panel, series, meta, extractFields)', () => {
  let panel: Panel;
  let series: Series;
  let resp: unknown;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
    } as Panel;
    series = {
      chart_type: 'line',
      stacked: 'stacked',
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: 'rgb(255, 0, 0)',
      id: 'test',
      split_mode: 'everything',
      metrics: [
        {
          id: 'pct_rank',
          type: 'percentile_rank',
          field: 'cpu',
          values: ['1000', '500'],
          colors: ['#000028', '#0000FF'],
        },
      ],
    } as unknown as Series;
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                pct_rank: {
                  values: { '500.0': 1, '1000.0': 2 },
                },
              },
              {
                key: 2,
                pct_rank: {
                  values: { '500.0': 3, '1000.0': 1 },
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

    await percentileRank(resp, panel, series, {})(next)([]);

    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', async () => {
    const next = (results: unknown) => results;
    const results = await percentileRank(resp, panel, series, {})(next)([]);

    expect(results).toHaveLength(2);

    expect(results[0]).toHaveProperty('id', 'test╰┄►1000╰┄►0');
    expect(results[0]).toHaveProperty('color', '#000028');
    expect(results[0]).toHaveProperty('label', '(1000) Percentile Rank of cpu');
    expect(results[0].data).toEqual([
      [1, 2],
      [2, 1],
    ]);

    expect(results[1]).toHaveProperty('id', 'test╰┄►500╰┄►1');
    expect(results[1]).toHaveProperty('color', '#0000FF');
    expect(results[1]).toHaveProperty('label', '(500) Percentile Rank of cpu');
    expect(results[1].data).toEqual([
      [1, 1],
      [2, 3],
    ]);
  });
});
