/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { query } from './query';

describe('query', () => {
  let panel;
  let series;
  let req;
  let seriesIndex;
  let buildSeriesMetaParams;

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
  };

  beforeEach(() => {
    req = {
      body: {
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
    seriesIndex = {};
    buildSeriesMetaParams = jest.fn().mockResolvedValue({
      timeField: panel.time_field,
      interval: panel.interval,
    });
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await query(req, panel, series, config, seriesIndex, null, null, buildSeriesMetaParams)(next)(
      {}
    );
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns doc with query for timerange', async () => {
    const next = (doc) => doc;
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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

  test('returns doc with query for timerange (offset by 1h)', async () => {
    series.offset_time = '1h';
    const next = (doc) => doc;
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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

  test('returns doc with global query', async () => {
    req.body.filters = [
      {
        query: {
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
      },
    ];
    const next = (doc) => doc;
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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

  test('returns doc with series filter', async () => {
    series.filter = { query: 'host:web-server', language: 'lucene' };
    const next = (doc) => doc;
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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
  test('returns doc with panel filter and global', async () => {
    req.body.filters = [
      {
        query: {
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
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    const next = (doc) => doc;
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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

  test('returns doc with panel filter (ignoring globals)', async () => {
    req.body.filters = [
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
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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

  test('returns doc with panel filter (ignoring globals from series)', async () => {
    req.body.filters = [
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
    const doc = await query(
      req,
      panel,
      series,
      config,
      seriesIndex,
      null,
      null,
      buildSeriesMetaParams
    )(next)({});
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
