/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitByFilters } from './split_by_filters';

describe('splitByFilters(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let config;
  let seriesIndex;

  beforeEach(() => {
    config = {};
    panel = {
      time_field: 'timestamp',
    };
    series = {
      id: 'test',
      split_mode: 'filters',
      split_filters: [
        {
          id: 'filter-1',
          color: '#F00',
          filter: { query: 'status_code:[* TO 200]', language: 'lucene' },
          label: '200s',
        },
        {
          id: 'filter-2',
          color: '#0F0',
          filter: { query: 'status_code:[300 TO *]', language: 'lucene' },
          label: '300s',
        },
      ],
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }],
    };
    req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    seriesIndex = {};
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    splitByFilters(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns a valid terms agg', () => {
    const next = (doc) => doc;
    const doc = splitByFilters(req, panel, series, config, seriesIndex)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          filters: {
            filters: {
              'filter-1': {
                bool: {
                  filter: [],
                  must: [
                    {
                      query_string: {
                        query: 'status_code:[* TO 200]',
                      },
                    },
                  ],
                  must_not: [],
                  should: [],
                },
              },
              'filter-2': {
                bool: {
                  filter: [],
                  must: [
                    {
                      query_string: {
                        query: 'status_code:[300 TO *]',
                      },
                    },
                  ],
                  must_not: [],
                  should: [],
                },
              },
            },
          },
        },
      },
    });
  });

  test('calls next and does not add a terms agg', () => {
    series.split_mode = 'everything';
    const next = jest.fn((doc) => doc);
    const doc = splitByFilters(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
    expect(doc).toEqual({});
  });
});
