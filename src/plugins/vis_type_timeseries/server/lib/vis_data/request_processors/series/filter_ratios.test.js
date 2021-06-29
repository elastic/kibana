/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ratios } from './filter_ratios';

describe('ratios(req, panel, series, esQueryConfig, seriesIndex)', () => {
  let panel;
  let series;
  let req;
  let esQueryConfig;
  let indexPattern;
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
          numerator: { query: 'errors', language: 'lucene' },
          denominator: { query: 'warnings', language: 'lucene' },
          metric_agg: 'avg',
          field: 'cpu',
        },
      ],
    };
    req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    esQueryConfig = {
      allowLeadingWildcards: true,
      queryStringOptions: { analyze_wildcard: true },
      ignoreFilterIfFieldNotInIndex: false,
    };
    indexPattern = {};
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    ratios(req, panel, series, esQueryConfig, indexPattern)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns filter ratio aggs', () => {
    const next = (doc) => doc;
    const doc = ratios(req, panel, series, esQueryConfig, indexPattern)(next)({});
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
                    bool: {
                      must: [
                        {
                          query_string: {
                            query: 'warnings',
                            analyze_wildcard: true,
                          },
                        },
                      ],
                      filter: [],
                      should: [],
                      must_not: [],
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
                    bool: {
                      must: [
                        {
                          query_string: {
                            query: 'errors',
                            analyze_wildcard: true,
                          },
                        },
                      ],
                      filter: [],
                      should: [],
                      must_not: [],
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
    const doc = ratios(req, panel, series, esQueryConfig, indexPattern)(next)({});
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
                    bool: {
                      must: [
                        {
                          query_string: {
                            query: 'warnings',
                            analyze_wildcard: true,
                          },
                        },
                      ],
                      filter: [],
                      should: [],
                      must_not: [],
                    },
                  },
                },
                'metric-1-numerator': {
                  aggs: { metric: {} },
                  filter: {
                    bool: {
                      must: [
                        {
                          query_string: {
                            analyze_wildcard: true,
                            query: 'errors',
                          },
                        },
                      ],
                      filter: [],
                      should: [],
                      must_not: [],
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
