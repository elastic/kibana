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

  test('calls next when finished', () => {
    const next = jest.fn();
    stdDeviationBands(resp, panel, series)(next)([]);
    expect(next.mock.calls.length).toEqual(1);
  });

  test('creates a series', () => {
    const next = (results) => results;
    const results = stdDeviationBands(resp, panel, series)(next)([]);
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
