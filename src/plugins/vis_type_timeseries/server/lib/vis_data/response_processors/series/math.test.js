/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { mathAgg } from './math';
import { stdMetric } from './std_metric';

describe('math(resp, panel, series)', () => {
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
      id: 'test',
      label: 'Math',
      split_mode: 'terms',
      split_color_mode: 'gradient',
      color: '#F00',
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'mincpu',
          type: 'min',
          field: 'cpu',
        },
        {
          id: 'mathagg',
          type: 'math',
          script: 'divide(params.a, params.b)',
          variables: [
            { name: 'a', field: 'avgcpu' },
            { name: 'b', field: 'mincpu' },
          ],
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          meta: {
            bucketSize: 5,
          },
          buckets: [
            {
              key: 'example-01',
              timeseries: {
                buckets: [
                  {
                    key: 1,
                    avgcpu: { value: 0.25 },
                    mincpu: { value: 0.125 },
                  },
                  {
                    key: 2,
                    avgcpu: { value: 0.25 },
                    mincpu: { value: 0.25 },
                  },
                ],
              },
            },
          ],
        },
      },
    };
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    mathAgg(resp, panel, series)(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', () => {
    const next = mathAgg(resp, panel, series)((results) => results);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(results).toHaveLength(1);

    expect(results[0]).toEqual({
      id: 'test:example-01',
      label: 'example-01',
      color: 'rgb(255, 0, 0)',
      stack: false,
      seriesId: 'test',
      lines: { show: true, fill: 0, lineWidth: 1, steps: false },
      points: { show: true, radius: 1, lineWidth: 1 },
      bars: { fill: 0, lineWidth: 1, show: false },
      data: [
        [1, 2],
        [2, 1],
      ],
    });
  });

  test('turns division by zero into null values', () => {
    resp.aggregations.test.buckets[0].timeseries.buckets[0].mincpu = 0;
    const next = mathAgg(resp, panel, series)((results) => results);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(results).toHaveLength(1);

    expect(results[0]).toEqual(
      expect.objectContaining({
        data: [
          [1, null],
          [2, 1],
        ],
      })
    );
  });

  test('throws on actual tinymath expression errors', () => {
    series.metrics[2].script = 'notExistingFn(params.a)';
    expect(() =>
      stdMetric(resp, panel, series)(mathAgg(resp, panel, series)((results) => results))([])
    ).toThrow();

    series.metrics[2].script = 'divide(params.a, params.b';
    expect(() =>
      stdMetric(resp, panel, series)(mathAgg(resp, panel, series)((results) => results))([])
    ).toThrow();
  });
});
