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

import { normalizeQuery } from './normalize_query';

describe('normalizeQuery', () => {
  const req = 'req';
  const seriesId = '61ca57f1-469d-11e7-af02-69e470af7417';

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
        },
      },
    },
  });

  beforeEach(() => {
    next = jest.fn(x => x);
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
      intervalString: '10s',
      bucketSize: 10,
      seriesId: [seriesId],
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
