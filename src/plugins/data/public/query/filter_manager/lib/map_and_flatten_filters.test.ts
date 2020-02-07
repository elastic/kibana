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

import { mapAndFlattenFilters } from './map_and_flatten_filters';
import { esFilters } from '../../../../common';

describe('filter manager utilities', () => {
  describe('mapAndFlattenFilters()', () => {
    let filters: unknown;

    function getDisplayName(filter: esFilters.Filter) {
      return typeof filter.meta.value === 'function' ? filter.meta.value() : filter.meta.value;
    }

    beforeEach(() => {
      filters = [
        null,
        [
          { meta: { index: 'logstash-*' }, exists: { field: '_type' } },
          { meta: { index: 'logstash-*' }, missing: { field: '_type' } },
        ],
        { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } },
        { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } },
        {
          meta: { index: 'logstash-*' },
          query: { match: { _type: { query: 'apache', type: 'phrase' } } },
        },
      ];
    });

    test('should map and flatten the filters', () => {
      const results = mapAndFlattenFilters(filters as esFilters.Filter[]);

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('meta');
      expect(results[1]).toHaveProperty('meta');
      expect(results[2]).toHaveProperty('meta');
      expect(results[3]).toHaveProperty('meta');
      expect(results[4]).toHaveProperty('meta');
      expect(results[0].meta).toHaveProperty('key', '_type');
      expect(results[0].meta).toHaveProperty('value', 'exists');
      expect(results[1].meta).toHaveProperty('key', '_type');
      expect(results[1].meta).toHaveProperty('value', 'missing');
      expect(results[2].meta).toHaveProperty('key', 'query');
      expect(results[2].meta).toHaveProperty('value', 'foo:bar');
      expect(results[3].meta).toHaveProperty('key', 'bytes');
      expect(results[3].meta).toHaveProperty('value');
      expect(getDisplayName(results[3])).toBe('1024 to 2048');
      expect(results[4].meta).toHaveProperty('key', '_type');
      expect(results[4].meta).toHaveProperty('value');
      expect(getDisplayName(results[4])).toBe('apache');
    });
  });
});
