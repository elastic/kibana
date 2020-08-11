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

import { esdsl } from './esdsl';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

jest.mock('../../services', () => ({
  getUiSettings: () => ({
    get: () => true,
  }),
  getSearchService: () => ({
    search: jest.fn((params: any) => {
      return {
        toPromise: async () => {
          return { rawResponse: params };
        },
      };
    }),
  }),
}));

describe('esdsl', () => {
  describe('correctly handles input', () => {
    test('throws on invalid json input', async () => {
      const fn = async function () {
        await esdsl().fn(null, { dsl: 'invalid json', index: 'test', size: 0 }, {
          inspectorAdapters: {},
        } as any);
      };

      let errorMessage;
      try {
        await fn();
      } catch (error) {
        errorMessage = error.message;
      }
      expect(errorMessage).toEqual('Unexpected token i in JSON at position 0');
    });

    test('adds filters', async () => {
      const result = await esdsl().fn(
        {
          type: 'kibana_context',
          filters: [
            {
              meta: { index: '1', alias: 'test', negate: false, disabled: false },
              query: { match_phrase: { gender: 'male' } },
            },
          ],
        },
        { dsl: '{}', index: 'test', size: 0 },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds filters to query with filters', async () => {
      const result = await esdsl().fn(
        {
          type: 'kibana_context',
          filters: [
            {
              meta: { index: '1', alias: 'test', negate: false, disabled: false },
              query: { match_phrase: { gender: 'male' } },
            },
          ],
        },
        {
          index: 'kibana_sample_data_logs',
          size: 4,
          dsl: '{"_source": false, "query": { "term": { "machine.os.keyword": "osx"}}}',
        },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds query', async () => {
      const result = await esdsl().fn(
        {
          type: 'kibana_context',
          query: { language: 'lucene', query: '*' },
        },
        { dsl: '{}', index: 'test', size: 0 },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds query to a query with filters', async () => {
      const result = await esdsl().fn(
        {
          type: 'kibana_context',
          query: { language: 'lucene', query: '*' },
        },
        {
          index: 'kibana_sample_data_logs',
          size: 4,
          dsl: '{ "_source": false, "query": { "term": { "machine.os.keyword": "osx"}}}',
        },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('ignores timerange', async () => {
      const result = await esdsl().fn(
        {
          type: 'kibana_context',
          timeRange: { from: 'now-15m', to: 'now' },
        },
        { dsl: '{}', index: 'test', size: 0 },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });
  });

  test('correctly handles filter, query and timerange on context', async () => {
    const result = await esdsl().fn(
      {
        type: 'kibana_context',
        query: { language: 'lucene', query: '*' },
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [
          {
            meta: { index: '1', alias: 'test', negate: false, disabled: false },
            query: { match_phrase: { gender: 'male' } },
          },
        ],
      },
      {
        index: 'kibana_sample_data_logs',
        size: 4,
        dsl: '{ "_source": false, "query": { "term": { "machine.os.keyword": "osx"}}}',
      },
      { inspectorAdapters: {} } as any
    );

    expect(result).toMatchSnapshot();
  });
});
