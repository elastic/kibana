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

import { extractTimeFilter } from './extract_time_filter';
import { esFilters } from '../../../../../../plugins/data/public';

describe('filter manager utilities', () => {
  describe('extractTimeFilter()', () => {
    test('should detect timeFilter', async () => {
      const filters: esFilters.Filter[] = [
        esFilters.buildQueryFilter(
          { _type: { match: { query: 'apache', type: 'phrase' } } },
          'logstash-*',
          ''
        ),
        esFilters.buildRangeFilter(
          { name: 'time' },
          { gt: 1388559600000, lt: 1388646000000 },
          'logstash-*'
        ),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toEqual(filters[1]);
      expect(result.restOfFilters[0]).toEqual(filters[0]);
    });

    test("should not return timeFilter when name doesn't match", async () => {
      const filters: esFilters.Filter[] = [
        esFilters.buildQueryFilter(
          { _type: { match: { query: 'apache', type: 'phrase' } } },
          'logstash-*',
          ''
        ),
        esFilters.buildRangeFilter({ name: '@timestamp' }, { from: 1, to: 2 }, 'logstash-*', ''),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toBeUndefined();
      expect(result.restOfFilters).toEqual(filters);
    });

    test('should not return a non range filter, even when names match', async () => {
      const filters: esFilters.Filter[] = [
        esFilters.buildQueryFilter(
          { _type: { match: { query: 'apache', type: 'phrase' } } },
          'logstash-*',
          ''
        ),
        esFilters.buildPhraseFilter({ name: 'time' }, 'banana', 'logstash-*'),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toBeUndefined();
      expect(result.restOfFilters).toEqual(filters);
    });
  });
});
