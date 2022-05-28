/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getEsdsl } from './esdsl';
import { MockedKeys } from '@kbn/utility-types/jest';
import { EsdslExpressionFunctionDefinition } from '../../../common/search/expressions';
import { StartServicesAccessor } from '@kbn/core/public';
import { DataPublicPluginStart, DataStartDependencies } from '../../types';
import { of } from 'rxjs';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('esdsl', () => {
  let getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
  let startDependencies: MockedKeys<
    StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>
  >;
  let esdsl: EsdslExpressionFunctionDefinition;

  beforeEach(() => {
    jest.clearAllMocks();
    startDependencies = [
      {
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
      },
      {},
      {
        search: {
          search: jest.fn((params: any) => of({ rawResponse: params })),
        },
      },
    ];
    getStartServices = jest
      .fn()
      .mockResolvedValue(new Promise((resolve) => resolve(startDependencies)));
    esdsl = getEsdsl({ getStartServices });
  });

  describe('correctly handles input', () => {
    test('throws on invalid json input', async () => {
      const fn = async function () {
        await esdsl.fn(null, { dsl: 'invalid json', index: 'test', size: 0 }, {
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
      const result = await esdsl.fn(
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
      const result = await esdsl.fn(
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
      const result = await esdsl.fn(
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
      const result = await esdsl.fn(
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
      const result = await esdsl.fn(
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
    const result = await esdsl.fn(
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
