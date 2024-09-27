/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitByFilter } from './split_by_filter';

describe('splitByFilter(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let config;
  let seriesIndex;

  beforeEach(() => {
    panel = {};
    config = {};
    series = {
      id: 'test',
      split_mode: 'filter',
      filter: { query: 'host:example-01', language: 'lucene' },
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
    splitByFilter(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns a valid filter with a query_string', () => {
    const next = (doc) => doc;
    const doc = splitByFilter(req, panel, series, config, seriesIndex)(next)({});
    expect(doc).toEqual({
      aggs: {
        test: {
          filter: {
            bool: {
              filter: [],
              must: [
                {
                  query_string: {
                    query: 'host:example-01',
                  },
                },
              ],
              must_not: [],
              should: [],
            },
          },
        },
      },
    });
  });

  test('calls next and does not add a filter', () => {
    series.split_mode = 'terms';
    const next = jest.fn((doc) => doc);
    const doc = splitByFilter(req, panel, series, config, seriesIndex)(next)({});
    expect(next.mock.calls.length).toEqual(1);
    expect(doc).toEqual({});
  });
});
