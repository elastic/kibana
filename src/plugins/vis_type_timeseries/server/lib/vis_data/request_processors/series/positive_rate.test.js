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

import { positiveRate } from './positive_rate';
describe('positiveRate(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
    };
    series = {
      id: 'test',
      split_mode: 'terms',
      terms_size: 10,
      terms_field: 'host',
      metrics: [
        {
          id: 'metric-1',
          type: 'positive_rate',
          field: 'system.network.out.bytes',
          unit: '1s',
        },
      ],
    };
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    positiveRate(req, panel, series)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns positive rate aggs', () => {
    const next = (doc) => doc;
    const doc = positiveRate(req, panel, series)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1-positive-rate-max': {
                  max: { field: 'system.network.out.bytes' },
                },
                'metric-1-positive-rate-derivative': {
                  derivative: {
                    buckets_path: 'metric-1-positive-rate-max',
                    gap_policy: 'skip',
                    unit: '1s',
                  },
                },
                'metric-1': {
                  bucket_script: {
                    buckets_path: { value: 'metric-1-positive-rate-derivative[normalized_value]' },
                    script: {
                      source: 'params.value > 0.0 ? params.value : 0.0',
                      lang: 'painless',
                    },
                    gap_policy: 'skip',
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
