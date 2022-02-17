/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { normalizeQuery } from './normalize_query';
import { overwrite } from '../../helpers';

import {
  TableRequestProcessorsFunction,
  TableRequestProcessorsParams,
  TableSearchRequest,
} from './types';

describe('normalizeQuery', () => {
  const seriesId = '61ca57f1-469d-11e7-af02-69e470af7417';
  const panelId = '39d49073-a924-426b-aa32-35acb40a9bb7';
  const tableRequestProcessorsParams = {} as TableRequestProcessorsParams;

  const next = jest.fn((x) => x) as unknown as ReturnType<
    ReturnType<TableRequestProcessorsFunction>
  >;

  const getMockedDoc = (): TableSearchRequest => ({
    size: 0,
    query: {},
    aggs: {
      pivot: {
        terms: {
          field: 'currency',
        },
        aggs: {
          [seriesId]: {
            aggs: {
              timeseries: {
                date_histogram: {
                  field: 'order_date',
                  extended_bounds: {
                    min: 1564397420526,
                    max: 1564398320526,
                  },
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
              panelId,
            },
          },
        },
      },
    },
  });

  test('should remove the top level aggregation if filter.match_all is empty', async () => {
    const doc = getMockedDoc();

    overwrite(doc, `aggs.pivot.aggs.${seriesId}.filter`, {
      match_all: {},
    });

    const modifiedDoc = await normalizeQuery(tableRequestProcessorsParams)(next)(doc);
    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs.timeseries).toBeUndefined();
    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs[seriesId]).toBeDefined();

    expect(modifiedDoc.aggs.pivot.aggs[seriesId].meta).toEqual({
      seriesId,
      normalized: true,
      timeField: 'order_date',
      intervalString: '10s',
      bucketSize: 10,
      panelId,
    });
  });

  test('should not remove the top level aggregation if filter.match_all is not empty', async () => {
    const doc = getMockedDoc();

    overwrite(doc, `aggs.pivot.aggs.${seriesId}.filter`, {
      match_all: { filter: 1 },
    });

    const modifiedDoc = await normalizeQuery(tableRequestProcessorsParams)(next)(doc);

    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs.timeseries).toBeDefined();
    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs[seriesId]).toBeUndefined();
  });

  test('should not remove the top level aggregation for Sibling Pipeline queries', async () => {
    const doc = getMockedDoc();
    const pipelineId = 'd4167fe0-afb0-11e9-b141-7b94c69f37eb';

    overwrite(doc, `aggs.pivot.aggs[${seriesId}].filter`, {
      match_all: {},
    });

    overwrite(doc, `aggs.pivot.aggs[${seriesId}].aggs[${pipelineId}]`, {
      extended_stats_bucket: {
        buckets_path: 'timeseries>61ca57f2-469d-11e7-af02-69e470af7417',
      },
    });

    const modifiedDoc = await normalizeQuery(tableRequestProcessorsParams)(next)(doc);

    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs.timeseries).toBeDefined();
    expect(modifiedDoc.aggs.pivot.aggs[seriesId].aggs[seriesId]).toBeUndefined();
  });
});
