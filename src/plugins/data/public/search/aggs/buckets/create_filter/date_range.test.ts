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

import moment from 'moment';
import { getDateRangeBucketAgg, DateRangeBucketAggDependencies } from '../date_range';
import { createFilterDateRange } from './date_range';
import { FieldFormatsGetConfigFn } from '../../../../../common';
import { DateFormat } from '../../../../field_formats';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { coreMock } from '../../../../../../../core/public/mocks';

describe('AggConfig Filters', () => {
  describe('Date range', () => {
    let aggTypesDependencies: DateRangeBucketAggDependencies;

    beforeEach(() => {
      const { uiSettings } = coreMock.createSetup();

      aggTypesDependencies = { uiSettings };
    });

    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
      const field = {
        name: '@timestamp',
        format: new DateFormat({}, getConfig),
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            type: BUCKET_TYPES.DATE_RANGE,
            params: {
              field: '@timestamp',
              ranges: [{ from: '2014-01-01', to: '2014-12-31' }],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry([getDateRangeBucketAgg(aggTypesDependencies)]),
        }
      );
    };

    test('should return a range filter for date_range agg', () => {
      const aggConfigs = getAggConfigs();
      const from = new Date('1 Feb 2015');
      const to = new Date('7 Feb 2015');
      const filter = createFilterDateRange(aggConfigs.aggs[0] as IBucketAggConfig, {
        from: from.valueOf(),
        to: to.valueOf(),
      });

      expect(filter).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.range).toHaveProperty('@timestamp');
      expect(filter.range['@timestamp']).toHaveProperty('gte', moment(from).toISOString());
      expect(filter.range['@timestamp']).toHaveProperty('lt', moment(to).toISOString());
    });
  });
});
