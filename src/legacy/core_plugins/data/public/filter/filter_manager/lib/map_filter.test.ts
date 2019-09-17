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

import { Filter } from '@kbn/es-query';
import { mapFilter } from './map_filter';
import { StubIndexPatterns } from '../test_helpers/stub_index_pattern';
import { IndexPatterns } from '../../../index_patterns';

describe('Filter Bar Directive', () => {
  let indexPatterns: IndexPatterns;

  beforeEach(() => {
    const stubIndexPatterns: unknown = new StubIndexPatterns();

    indexPatterns = stubIndexPatterns as IndexPatterns;
  });

  describe('mapFilter()', () => {
    test('should map query filters', async () => {
      const before = {
        meta: { index: 'logstash-*' },
        query: { match: { _type: { query: 'apache' } } },
      };

      const after = await mapFilter(indexPatterns, before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '_type');
      expect(after.meta).toHaveProperty('value', 'apache');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map exists filters', async () => {
      const before: any = { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } };

      const after = await mapFilter(indexPatterns, before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '@timestamp');
      expect(after.meta).toHaveProperty('value', 'exists');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map missing filters', async () => {
      const before: any = { meta: { index: 'logstash-*' }, missing: { field: '@timestamp' } };

      const after = await mapFilter(indexPatterns, before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '@timestamp');
      expect(after.meta).toHaveProperty('value', 'missing');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map json filter', async () => {
      const before: any = { meta: { index: 'logstash-*' }, query: { match_all: {} } };

      const after = await mapFilter(indexPatterns, before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', 'query');
      expect(after.meta).toHaveProperty('value', '{"match_all":{}}');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should finish with a catch', async done => {
      const before: any = { meta: { index: 'logstash-*' } };

      try {
        await mapFilter(indexPatterns, before as Filter);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('No mappings have been found for filter.');

        done();
      }
    });
  });
});
