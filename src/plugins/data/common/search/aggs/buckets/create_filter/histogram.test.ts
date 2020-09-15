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

import { BytesFormat, FieldFormatsGetConfigFn } from '../../../../../common/field_formats';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry, mockGetFieldFormatsStart } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { createFilterHistogram } from './histogram';

describe('AggConfig Filters', () => {
  describe('histogram', () => {
    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
      const field = {
        name: 'bytes',
        format: new BytesFormat({}, getConfig),
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
        getFormatterForField: () => new BytesFormat({}, getConfig),
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            id: BUCKET_TYPES.HISTOGRAM,
            type: BUCKET_TYPES.HISTOGRAM,
            schema: 'buckets',
            params: {
              field: 'bytes',
              interval: 1024,
            },
          },
        ],
        { typesRegistry: mockAggTypesRegistry() }
      );
    };

    test('should return an range filter for histogram', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterHistogram(mockGetFieldFormatsStart)(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '2048'
      );

      expect(mockGetFieldFormatsStart().deserialize).toHaveBeenCalledTimes(1);
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter).toHaveProperty('range');
      expect(filter.range).toHaveProperty('bytes');
      expect(filter.range.bytes).toHaveProperty('gte', 2048);
      expect(filter.range.bytes).toHaveProperty('lt', 3072);
      expect(filter.meta).toHaveProperty('formattedValue');
    });
  });
});
