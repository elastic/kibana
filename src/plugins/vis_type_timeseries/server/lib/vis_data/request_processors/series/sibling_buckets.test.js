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

import { siblingBuckets } from './sibling_buckets';

describe('siblingBuckets(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let uiSettings;

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
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'metric-2',
          type: 'avg_bucket',
          field: 'metric-1',
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
    uiSettings = {
      get: async () => 50,
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await siblingBuckets(req, panel, series, {}, {}, undefined, uiSettings)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns sibling aggs', async () => {
    const next = (doc) => doc;
    const doc = await siblingBuckets(req, panel, series, {}, {}, undefined, uiSettings)(next)({});

    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            'metric-2': {
              extended_stats_bucket: {
                buckets_path: 'timeseries>metric-1',
              },
            },
          },
        },
      },
    });
  });
});
