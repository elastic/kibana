/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { calculateBounds } from '@kbn/data-plugin/public';
import { buildBucketInterval } from './build_bucket_interval';

describe('buildBucketInterval', () => {
  const getOptions = () => {
    const response = {
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: 29,
        max_score: null,
        hits: [],
      },
      aggregations: {
        '2': {
          buckets: [
            {
              key_as_string: '2022-10-05T16:00:00.000-03:00',
              key: 1664996400000,
              doc_count: 6,
            },
            {
              key_as_string: '2022-10-05T16:30:00.000-03:00',
              key: 1664998200000,
              doc_count: 2,
            },
            {
              key_as_string: '2022-10-05T17:00:00.000-03:00',
              key: 1665000000000,
              doc_count: 3,
            },
            {
              key_as_string: '2022-10-05T17:30:00.000-03:00',
              key: 1665001800000,
              doc_count: 8,
            },
            {
              key_as_string: '2022-10-05T18:00:00.000-03:00',
              key: 1665003600000,
              doc_count: 10,
            },
          ],
        },
      },
    };
    const dataView = dataViewWithTimefieldMock;
    const dataMock = dataPluginMock.createStartContract();
    dataMock.query.timefilter.timefilter.getTime = () => {
      return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
    };
    dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
      return calculateBounds(timeRange);
    };
    return {
      data: dataMock,
      dataView,
      timeInterval: 'auto',
      response,
      timeRange: {
        from: '1991-03-29T08:04:00.694Z',
        to: '2021-03-29T07:04:00.695Z',
      },
    };
  };

  it('should return an empty object if response or timeInterval is undefined', () => {
    expect(
      buildBucketInterval({
        ...getOptions(),
        response: undefined,
        timeInterval: undefined,
      })
    ).toEqual({});
    expect(
      buildBucketInterval({
        ...getOptions(),
        response: undefined,
      })
    ).toEqual({});
    expect(
      buildBucketInterval({
        ...getOptions(),
        timeInterval: undefined,
      })
    ).toEqual({});
  });
});
