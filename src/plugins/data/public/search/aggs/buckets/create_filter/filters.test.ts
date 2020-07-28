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

import { getFiltersBucketAgg, FiltersBucketAggDependencies } from '../filters';
import { createFilterFilters } from './filters';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IBucketAggConfig } from '../bucket_agg_type';
import { coreMock } from '../../../../../../../core/public/mocks';

describe('AggConfig Filters', () => {
  describe('filters', () => {
    let aggTypesDependencies: FiltersBucketAggDependencies;

    beforeEach(() => {
      const { uiSettings } = coreMock.createSetup();

      aggTypesDependencies = { uiSettings };
    });

    const getAggConfigs = () => {
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
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: 'type:apache', language: 'lucene' } },
                { input: { query: 'type:nginx', language: 'lucene' } },
              ],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry([getFiltersBucketAgg(aggTypesDependencies)]),
        }
      );
    };

    test('should return a filters filter', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterFilters(aggConfigs.aggs[0] as IBucketAggConfig, 'type:nginx');

      expect(filter!.query.bool.must[0].query_string.query).toBe('type:nginx');
      expect(filter!.meta).toHaveProperty('index', '1234');
      expect(filter!.meta).toHaveProperty('alias', 'type:nginx');
    });
  });
});
