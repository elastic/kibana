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

import { SavedQueryFilter, buildSavedQueryFilter, buildEmptyFilter } from '@kbn/es-query';
import { mapSavedQuery } from './map_saved_query';

describe('filter manager utilities', () => {
  describe('mapSavedQuery', () => {
    test('should return undefined for none matching', async done => {
      const filter = buildEmptyFilter(true) as SavedQueryFilter;
      try {
        await mapSavedQuery(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
    test('should return the key and params for matching filters', async () => {
      const savedQueryTestItem = {
        id: 'foo',
        attributes: {
          title: 'foo',
          description: 'bar',
          query: {
            language: 'kuery',
            query: 'response:200',
          },
          filters: [],
        },
      };
      const filter = buildSavedQueryFilter(savedQueryTestItem);
      const result = await mapSavedQuery(filter);
      expect(result).toHaveProperty('key', 'foo');
      expect(result).toHaveProperty('type', 'savedQuery');
      expect(result.params).toHaveProperty('savedQuery', {
        attributes: {
          description: 'bar',
          filters: [],
          query: { language: 'kuery', query: 'response:200' },
          title: 'foo',
        },
        id: 'foo',
      });
    });
  });
});
