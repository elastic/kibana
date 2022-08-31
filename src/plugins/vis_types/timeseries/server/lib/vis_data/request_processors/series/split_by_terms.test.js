/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { splitByTerms } from './split_by_terms';

describe('splitByTerms', () => {
  let panel;
  let series;
  let req;
  let config;
  let seriesIndex;

  beforeEach(() => {
    config = {
      allowLeadingWildcards: true,
      queryStringOptions: { analyze_wildcard: true },
    };
    panel = {
      time_field: 'timestamp',
    };
    series = {
      id: 'test',
      split_mode: 'terms',
      terms_size: 10,
      terms_field: 'host',
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
    splitByTerms(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns a valid terms agg', () => {
    const next = (doc) => doc;
    const doc = splitByTerms(req, panel, series, config, seriesIndex)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          terms: {
            field: 'host',
            order: {
              _count: 'desc',
            },
            size: 10,
            shard_size: 25,
          },
        },
      },
    });
  });

  test('returns a valid terms agg sort by terms', () => {
    const next = (doc) => doc;
    series.terms_order_by = '_key';
    series.terms_direction = 'asc';
    const doc = splitByTerms(req, panel, series, config, seriesIndex)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          terms: {
            field: 'host',
            order: {
              _key: 'asc',
            },
            size: 10,
            shard_size: 25,
          },
        },
      },
    });
  });

  test('returns a valid terms agg with custom sort', () => {
    series.terms_order_by = 'avgmetric';
    const next = (doc) => doc;
    const doc = splitByTerms(req, panel, series, config, seriesIndex)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          terms: {
            field: 'host',
            size: 10,
            shard_size: 25,
            order: {
              'avgmetric-SORT': 'desc',
            },
          },
          aggs: {
            'avgmetric-SORT': {
              avg: {
                field: 'cpu',
              },
            },
          },
        },
      },
    });
  });

  test('should ignore "include/exclude" for multi terms', () => {
    series.terms_include = 'a';
    series.terms_exclude = 'b';
    series.terms_field = ['c', 'd'];
    const next = jest.fn((doc) => doc);
    const doc = splitByTerms(req, panel, series, config, seriesIndex)(next)({});

    expect(doc).toMatchInlineSnapshot(`
      Object {
        "aggs": Object {
          "test": Object {
            "multi_terms": Object {
              "order": Object {
                "_count": "desc",
              },
              "shard_size": 25,
              "size": 10,
              "terms": Array [
                Object {
                  "field": "c",
                },
                Object {
                  "field": "d",
                },
              ],
            },
          },
        },
      }
    `);
  });

  test('calls next and does not add a terms agg', () => {
    series.split_mode = 'everything';
    const next = jest.fn((doc) => doc);
    const doc = splitByTerms(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
    expect(doc).toEqual({});
  });
});
