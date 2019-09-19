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

import { Filter, buildRangeFilter, buildQueryFilter } from '@kbn/es-query';
import { extractTimeFilter } from './extract_time_filter';
import { IndexPatterns } from '../../../index_patterns';

const mockIndexPatterns = jest.fn(
  () =>
    ({
      get: () => ({
        timeFieldName: 'time',
      }),
    } as any)
);

describe('Filter Bar Directive', () => {
  describe('extractTimeFilter()', () => {
    const indexPatterns = mockIndexPatterns() as IndexPatterns;

    test('should return the matching filter for the default time field', async () => {
      const filters: Filter[] = [
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'logstash-*'),
        buildRangeFilter({ name: 'time' }, { gt: 1388559600000, lt: 1388646000000 }, 'logstash-*'),
      ];
      const result = await extractTimeFilter(indexPatterns, filters);

      expect(result).toEqual(filters[1]);
    });

    test('should not return the non-matching filter for the default time field', async () => {
      const filters: Filter[] = [
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'logstash-*'),
        buildRangeFilter({ name: '@timestamp' }, { from: 1, to: 2 }, 'logstash-*'),
      ];
      const result = await extractTimeFilter(indexPatterns, filters);

      expect(result).toBeUndefined();
    });
  });
});
