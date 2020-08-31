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

import { stdDeviationSibling } from './std_deviation_sibling';

describe('stdDeviationSibling(resp, panel, series)', () => {
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
          mode: 'band',
          field: 'avgcpu',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          sib: {
            std_deviation: 0.23,
            std_deviation_bounds: {
              upper: 0.7,
              lower: 0.01,
            },
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

  test('calls next when finished', () => {
    const next = jest.fn();
    stdDeviationSibling(resp, panel, series)(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', () => {
    const next = (results) => results;
    const results = stdDeviationSibling(resp, panel, series)(next)([]);
    expect(results).toHaveLength(1);

    expect(results[0]).toEqual({
      id: 'test',
      color: 'rgb(255, 0, 0)',
      label: 'Overall Std. Deviation of Average of cpu',
      lines: { show: true, fill: 0.5, lineWidth: 0, mode: 'band' },
      bars: { show: false, fill: 0.5, mode: 'band' },
      points: { show: false },
      data: [
        [1, 0.7, 0.01],
        [2, 0.7, 0.01],
      ],
    });
  });
});
