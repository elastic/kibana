/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getEql } from './eql';
import { MockedKeys } from '@kbn/utility-types/jest';
import { EqlExpressionFunctionDefinition } from '../../../common/search/expressions';
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

describe('eql', () => {
  let getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
  let startDependencies: MockedKeys<
    StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>
  >;
  let eql: EqlExpressionFunctionDefinition;

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
          search: jest.fn((params: any) => of({ rawResponse: { body: params } })),
        },
        indexPatterns: {
          get: jest.fn(),
          create: jest.fn(),
        },
      },
    ];
    getStartServices = jest.fn().mockResolvedValue(startDependencies);
    eql = getEql({ getStartServices });
  });

  describe('correctly handles input', () => {
    test('adds filters', async () => {
      const result = await eql.fn(
        {
          type: 'kibana_context',
          filters: [
            {
              meta: { index: '1', alias: 'test', negate: false, disabled: false },
              query: { match_phrase: { gender: 'male' } },
            },
          ],
        },
        { query: 'test', index: 'test', size: 0, field: [] },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds filters to query with filters', async () => {
      const result = await eql.fn(
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
          query: 'test',
          field: [],
        },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds query', async () => {
      const result = await eql.fn(
        {
          type: 'kibana_context',
          query: { language: 'lucene', query: '*' },
        },
        { query: 'test', index: 'test', size: 0, field: [] },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('adds query to a query with filters', async () => {
      const result = await eql.fn(
        {
          type: 'kibana_context',
          query: { language: 'lucene', query: '*' },
        },
        {
          index: 'kibana_sample_data_logs',
          size: 4,
          query: 'test',
          field: [],
        },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });

    test('ignores timerange', async () => {
      const result = await eql.fn(
        {
          type: 'kibana_context',
          timeRange: { from: 'now-15m', to: 'now' },
        },
        { query: 'test', index: 'test', size: 0, field: [] },
        { inspectorAdapters: {} } as any
      );

      expect(result).toMatchSnapshot();
    });
  });

  test('correctly handles filter, query and timerange on context', async () => {
    const result = await eql.fn(
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
        query: 'test',
        field: [],
      },
      { inspectorAdapters: {} } as any
    );

    expect(result).toMatchSnapshot();
  });
});
