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

import { coreMock, notificationServiceMock } from '../../../../../../../src/core/public/mocks';
import { getDateRangeBucketAgg, DateRangeBucketAggDependencies } from './date_range';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { fieldFormatsServiceMock } from '../../../field_formats/mocks';
import { InternalStartServices } from '../../../types';

describe('date_range params', () => {
  let aggTypesDependencies: DateRangeBucketAggDependencies;

  beforeEach(() => {
    const { uiSettings } = coreMock.createSetup();

    aggTypesDependencies = {
      uiSettings,
      getInternalStartServices: () =>
        (({
          fieldFormats: fieldFormatsServiceMock.createStartContract(),
          notifications: notificationServiceMock.createStartContract(),
        } as unknown) as InternalStartServices),
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
        typesRegistry: mockAggTypesRegistry([getDateRangeBucketAgg(aggTypesDependencies)]),
      }
    );
  };

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
        uiSettings: {
          ...aggTypesDependencies.uiSettings,
          get: () => 'kibanaTimeZone' as any,
        },
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
