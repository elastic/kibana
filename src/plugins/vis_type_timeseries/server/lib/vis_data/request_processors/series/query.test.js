/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { query } from './query';

describe('query(req, panel, series)', () => {
  let panel;
  let series;
  let req;

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
  };
  beforeEach(() => {
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    panel = {
      index_pattern: '*',
      time_field: 'timestamp',
      interval: '10s',
    };
    series = { id: 'test' };
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    query(req, panel, series, config)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns doc with query for timerange', () => {
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  test('returns doc with query for timerange (offset by 1h)', () => {
    series.offset_time = '1h';
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2016-12-31T23:00:00.000Z',
                  lte: '2017-01-01T00:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  test('returns doc with global query', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example',
                    },
                  },
                ],
              },
            },
          ],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  test('returns doc with series filter', () => {
    series.filter = { query: 'host:web-server', language: 'lucene' };
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      analyze_wildcard: true,
                      query: series.filter.query,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });
  test('returns doc with panel filter and global', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example',
                    },
                  },
                ],
              },
            },
          ],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      query: panel.filter.query,
                      analyze_wildcard: true,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  test('returns doc with panel filter (ignoring globals)', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    panel.ignore_global_filter = true;
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      query: panel.filter.query,
                      analyze_wildcard: true,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  test('returns doc with panel filter (ignoring globals from series)', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    series.ignore_global_filter = true;
    const next = (doc) => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).toEqual({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      query: panel.filter.query,
                      analyze_wildcard: true,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });
});
