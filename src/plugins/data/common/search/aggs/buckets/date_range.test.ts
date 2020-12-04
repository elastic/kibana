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
