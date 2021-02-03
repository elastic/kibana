/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { positiveRate } from './positive_rate';
describe('positiveRate(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  let uiSettings;

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
          type: 'positive_rate',
          field: 'system.network.out.bytes',
          unit: '1s',
        },
      ],
    };
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    uiSettings = {
      get: async () => 50,
    };
  });

  test('calls next when finished', async () => {
    const next = jest.fn();
    await positiveRate(req, panel, series, {}, {}, undefined, uiSettings)(next)({});

    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns positive rate aggs', async () => {
    const next = (doc) => doc;
    const doc = await positiveRate(req, panel, series, {}, {}, undefined, uiSettings)(next)({});

    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1-positive-rate-max': {
                  max: { field: 'system.network.out.bytes' },
                },
                'metric-1-positive-rate-derivative': {
                  derivative: {
                    buckets_path: 'metric-1-positive-rate-max',
                    gap_policy: 'skip',
                    unit: '1s',
                  },
                },
                'metric-1': {
                  bucket_script: {
                    buckets_path: { value: 'metric-1-positive-rate-derivative[normalized_value]' },
                    script: {
                      source: 'params.value > 0.0 ? params.value : 0.0',
                      lang: 'painless',
                    },
                    gap_policy: 'skip',
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
