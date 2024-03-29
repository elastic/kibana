/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { normalizeQuery } from './normalize_query';

describe('normalizeQuery', () => {
  const req = 'req';
  const seriesId = '61ca57f1-469d-11e7-af02-69e470af7417';
  const panelId = '39d49073-a924-426b-aa32-35acb40a9bb7';

  let next;
  let panel;
  let series;

  const getMockedDoc = () => ({
    size: 0,
    query: {},
    aggs: {
      [seriesId]: {
        aggs: {
          timeseries: {
            date_histogram: {
              field: 'order_date',
              fixed_interval: '10s',
            },
            aggs: {
              [seriesId]: {
                bucket_script: {
                  buckets_path: {
                    count: '_count',
                  },
                  script: {
                    source: 'count * 1',
                    lang: 'expression',
                  },
                  gap_policy: 'skip',
                },
              },
            },
          },
        },
        meta: {
          timeField: 'order_date',
          intervalString: '10s',
          bucketSize: 10,
          seriesId: [seriesId],
          panelId,
        },
      },
    },
  });

  beforeEach(() => {
    next = jest.fn((x) => x);
    panel = {};
    series = {
      id: seriesId,
    };
  });

  test('should remove the top level aggregation if filter.match_all is empty', () => {
    const doc = getMockedDoc();

    doc.aggs[seriesId].filter = {
      match_all: {},
    };

    const modifiedDoc = normalizeQuery(req, panel, series)(next)(doc);

    expect(modifiedDoc.aggs[seriesId]).toBeUndefined();
    expect(modifiedDoc.aggs.timeseries).toBeDefined();

    expect(modifiedDoc.aggs.timeseries.meta).toEqual({
      timeField: 'order_date',
      normalized: true,
      intervalString: '10s',
      bucketSize: 10,
      seriesId: [seriesId],
      panelId: panelId,
    });
  });

  test('should not remove the top level aggregation if filter.match_all is not empty', () => {
    const doc = getMockedDoc();

    doc.aggs[seriesId].filter = {
      match_all: { filter: 1 },
    };

    const modifiedDoc = normalizeQuery(req, panel, series)(next)(doc);

    expect(modifiedDoc.aggs[seriesId]).toBeDefined();
    expect(modifiedDoc.aggs[seriesId].aggs.timeseries).toBeDefined();
    expect(modifiedDoc.aggs.timeseries).toBeUndefined();
  });

  test('should not remove the top level aggregation for Sibling Pipeline queries', () => {
    const doc = getMockedDoc();
    const pipelineId = 'd4167fe0-afb0-11e9-b141-7b94c69f37eb';

    doc.aggs[seriesId].filter = {
      match_all: {},
    };
    doc.aggs[seriesId].aggs[pipelineId] = {
      extended_stats_bucket: {
        buckets_path: 'timeseries>61ca57f2-469d-11e7-af02-69e470af7417',
      },
    };

    const modifiedDoc = normalizeQuery(req, panel, series)(next)(doc);

    expect(modifiedDoc.aggs[seriesId]).toBeDefined();
    expect(modifiedDoc.aggs[seriesId].aggs.timeseries).toBeDefined();
    expect(modifiedDoc.aggs[seriesId].aggs[pipelineId]).toBeDefined();
    expect(modifiedDoc.aggs.timeseries).toBeUndefined();
  });
});
