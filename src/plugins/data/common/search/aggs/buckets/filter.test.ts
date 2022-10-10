/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import moment from 'moment';
import { SerializableRecord } from '@kbn/utility-types';

describe('Filter Agg', () => {
  let aggConfigs: AggConfigs;

  const depMocks = {
    getConfig: <T>() => ({} as T),
    calculateBounds: () => {
      return {
        max: moment('2022-05-05T00:00:00.000Z'),
        min: undefined,
      };
    },
    getFieldFormatsStart: jest.fn(),
  };

  function init(params?: SerializableRecord) {
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      timeFieldName: 'timestamp',
      fields: {
        getByName: () => field,
        filter: () => [field],
        find: () => field,
      },
    } as any;

    const field = {
      name: 'A',
      indexPattern,
    };

    aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: BUCKET_TYPES.FILTER,
          type: BUCKET_TYPES.FILTER,
          schema: 'segment',
          params,
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry(depMocks),
      },
      jest.fn()
    );
    aggConfigs.setTimeRange({
      from: '2022-05-01T00:00:00.000Z',
      to: '2022-05-05T00:00:00.000Z',
    });
  }

  it('should build filter agg with time window and filter and time shift', () => {
    init({
      filter: {
        language: 'kuery',
        query: 'A: B',
      },
      timeWindow: '5m',
      timeShift: '1d',
    });
    expect(aggConfigs.aggs[0].write(aggConfigs)).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "timestamp": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2022-05-03T23:55:00.000Z",
                    "lte": "2022-05-04T00:00:00.000Z",
                  },
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "match": Object {
                              "A": "B",
                            },
                          },
                        ],
                      },
                    },
                  ],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
            ],
          },
        },
      }
    `);
  });

  it('should build filter agg with only time window', () => {
    init({
      timeWindow: '5m',
    });
    expect(aggConfigs.aggs[0].write(aggConfigs)).toMatchInlineSnapshot(`
      Object {
        "params": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "timestamp": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2022-05-04T23:55:00.000Z",
                    "lte": "2022-05-05T00:00:00.000Z",
                  },
                },
              },
            ],
          },
        },
      }
    `);
  });
});
