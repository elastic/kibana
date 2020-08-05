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

import { ratios } from './filter_ratios';

describe('ratios(req, panel, series)', () => {
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
          type: 'filter_ratio',
          numerator: 'errors',
          denominator: '*',
          metric_agg: 'avg',
          field: 'cpu',
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
    ratios(req, panel, series)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns filter ratio aggs', () => {
    const next = (doc) => doc;
    const doc = ratios(req, panel, series)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1': {
                  bucket_script: {
                    buckets_path: {
                      denominator: 'metric-1-denominator>metric',
                      numerator: 'metric-1-numerator>metric',
                    },
                    script:
                      'params.numerator != null && params.denominator != null &&' +
                      ' params.denominator > 0 ? params.numerator / params.denominator : 0',
                  },
                },
                'metric-1-denominator': {
                  aggs: {
                    metric: {
                      avg: {
                        field: 'cpu',
                      },
                    },
                  },
                  filter: {
                    query_string: {
                      analyze_wildcard: true,
                      query: '*',
                    },
                  },
                },
                'metric-1-numerator': {
                  aggs: {
                    metric: {
                      avg: {
                        field: 'cpu',
                      },
                    },
                  },
                  filter: {
                    query_string: {
                      analyze_wildcard: true,
                      query: 'errors',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test('returns empty object when field is not set', () => {
    delete series.metrics[0].field;
    const next = (doc) => doc;
    const doc = ratios(req, panel, series)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1': {
                  bucket_script: {
                    buckets_path: {
                      denominator: 'metric-1-denominator>metric',
                      numerator: 'metric-1-numerator>metric',
                    },
                    script:
                      'params.numerator != null && params.denominator != null &&' +
                      ' params.denominator > 0 ? params.numerator / params.denominator : 0',
                  },
                },
                'metric-1-denominator': {
                  aggs: { metric: {} },
                  filter: {
                    query_string: {
                      analyze_wildcard: true,
                      query: '*',
                    },
                  },
                },
                'metric-1-numerator': {
                  aggs: { metric: {} },
                  filter: {
                    query_string: {
                      analyze_wildcard: true,
                      query: 'errors',
                    },
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
