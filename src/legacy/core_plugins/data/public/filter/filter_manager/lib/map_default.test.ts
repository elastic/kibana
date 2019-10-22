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
import { CustomFilter, buildEmptyFilter, buildQueryFilter } from '@kbn/es-query';
import { mapDefault } from './map_default';

describe('filter manager utilities', () => {
  describe('mapDefault()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter: CustomFilter = buildQueryFilter({ match_all: {} }, 'index');
      const result = mapDefault(filter);

      expect(result).toHaveProperty('key', 'query');
      expect(result).toHaveProperty('value', '{"match_all":{}}');
    });

    test('should return undefined if there is no valid key', async () => {
      const filter = buildEmptyFilter(true) as CustomFilter;

      try {
        mapDefault(filter);
      } catch (e) {
        expect(e).toBe(filter);
      }
    });
  });
});
