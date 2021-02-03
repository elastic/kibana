/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { AggTypesDependencies } from '../agg_types';
import { mockAggTypesRegistry, mockAggTypesDependencies } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';

describe('date_range params', () => {
  let aggTypesDependencies: AggTypesDependencies;

  beforeEach(() => {
    aggTypesDependencies = {
      ...mockAggTypesDependencies,
      getConfig: jest.fn(),
      isDefaultTimezone: jest.fn().mockReturnValue(false),
    };
  });

  const getAggConfigs = (params: Record<string, any> = {}, hasIncludeTypeMeta: boolean = true) => {
    const field = {
      name: 'bytes',
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
      typeMeta: hasIncludeTypeMeta
        ? {
            aggs: {
              date_range: {
                bytes: {
                  time_zone: 'defaultTimeZone',
                },
              },
            },
          }
        : undefined,
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          id: BUCKET_TYPES.DATE_RANGE,
          type: BUCKET_TYPES.DATE_RANGE,
          schema: 'buckets',
          params,
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry(aggTypesDependencies),
      }
    );
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs();
    const dateRange = aggConfigs.aggs[0];
    expect(dateRange.toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "enabled": Array [
                true,
              ],
              "id": Array [
                "date_range",
              ],
              "ranges": Array [
                "[{\\"from\\":\\"now-1w/w\\",\\"to\\":\\"now\\"}]",
              ],
              "schema": Array [
                "buckets",
              ],
            },
            "function": "aggDateRange",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('getKey', () => {
    test('should return object', () => {
      const aggConfigs = getAggConfigs();
      const dateRange = aggConfigs.aggs[0];
      const bucket = { from: 'from-date', to: 'to-date', key: 'from-dateto-date' };

      expect(dateRange.getKey(bucket)).toEqual({ from: 'from-date', to: 'to-date' });
    });
  });

  describe('time_zone', () => {
    test('should use the specified time_zone', () => {
      const aggConfigs = getAggConfigs({
        time_zone: 'Europe/Minsk',
        field: 'bytes',
      });
      const dateRange = aggConfigs.aggs[0];
      const params = dateRange.toDsl()[BUCKET_TYPES.DATE_RANGE];

      expect(params.time_zone).toBe('Europe/Minsk');
    });

    test('should use the fixed time_zone from the index pattern typeMeta', () => {
      const aggConfigs = getAggConfigs({
        field: 'bytes',
      });
      const dateRange = aggConfigs.aggs[0];
      const params = dateRange.toDsl()[BUCKET_TYPES.DATE_RANGE];

      expect(params.time_zone).toBe('defaultTimeZone');
    });

    test('should use the Kibana time_zone if no parameter specified', () => {
      aggTypesDependencies = {
        ...aggTypesDependencies,
        getConfig: () => 'kibanaTimeZone' as any,
      };

      const aggConfigs = getAggConfigs(
        {
          field: 'bytes',
        },
        false
      );
      const dateRange = aggConfigs.aggs[0];
      const params = dateRange.toDsl()[BUCKET_TYPES.DATE_RANGE];

      expect(params.time_zone).toBe('kibanaTimeZone');
    });
  });
});
