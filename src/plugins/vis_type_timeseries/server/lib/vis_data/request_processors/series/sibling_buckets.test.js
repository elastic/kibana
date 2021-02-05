/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { siblingBuckets } from './sibling_buckets';

describe('siblingBuckets(req, panel, series)', () => {
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
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'metric-2',
          type: 'avg_bucket',
          field: 'metric-1',
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
      barTargetUiSettings: 50,
    };
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    siblingBuckets(req, panel, series, {}, {}, undefined, uiSettings)(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns sibling aggs', () => {
    const next = (doc) => doc;
    const doc = siblingBuckets(req, panel, series, {}, {}, undefined, uiSettings)(next)({});

    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            'metric-2': {
              extended_stats_bucket: {
                buckets_path: 'timeseries>metric-1',
              },
            },
          },
        },
      },
    });
  });
});
