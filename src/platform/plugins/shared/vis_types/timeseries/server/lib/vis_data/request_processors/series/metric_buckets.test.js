/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metricBuckets } from './metric_buckets';

describe('metricBuckets(req, panel, series)', () => {
  let metricBucketsProcessor;

  beforeEach(() => {
    metricBucketsProcessor = metricBuckets(
      {
        body: {
          timerange: {
            min: '2017-01-01T00:00:00Z',
            max: '2017-01-01T01:00:00Z',
          },
        },
      },
      {
        time_field: 'timestamp',
      },
      {
        id: 'test',
        split_mode: 'terms',
        terms_size: 10,
        terms_field: 'host',
        metrics: [
          {
            id: 'metric-1',
            type: 'max',
            field: 'io',
          },
          {
            id: 'metric-2',
            type: 'derivative',
            field: 'metric-1',
            unit: '1s',
          },
          {
            id: 'metric-3',
            type: 'avg_bucket',
            field: 'metric-2',
          },
        ],
      },
      {},
      {},
      { maxBucketsLimit: 2000, getValidTimeInterval: jest.fn(() => '1d') },
      {
        get: async () => 50,
      }
    );
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await metricBucketsProcessor(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns metric aggs', async () => {
    const next = (doc) => doc;
    const doc = await metricBucketsProcessor(next)({});

    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1': {
                  max: {
                    field: 'io',
                  },
                },
                'metric-2': {
                  derivative: {
                    buckets_path: 'metric-1',
                    gap_policy: 'skip',
                    unit: '1s',
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
