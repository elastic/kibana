/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEsqlFn } from './esql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type {
  ISearchMethods,
  IEsqlSearchParams,
  IEsqlSearchOptions,
  IEsqlSearchResult,
} from '@kbn/search-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { KibanaContext } from '..';

interface MockTypedSearchService {
  esql: jest.Mock<Promise<IEsqlSearchResult>, [IEsqlSearchParams, IEsqlSearchOptions?]>;
}

const makeDatatable = (): NonNullable<IEsqlSearchResult['datatable']> => ({
  type: 'datatable',
  columns: [{ id: 'col1', name: 'col1', meta: { type: 'string' } }],
  rows: [{ col1: 'value1' }],
  meta: { type: 'es_ql', statistics: { totalCount: 1 } },
});

const createExecutionContext = (): ExecutionContext =>
  ({
    abortSignal: new AbortController().signal,
    inspectorAdapters: {},
    getKibanaRequest: jest.fn(),
    getSearchSessionId: jest.fn(),
    getExecutionContext: jest.fn(),
  } as unknown as ExecutionContext);

const getMockSearchService = (): MockTypedSearchService => ({
  esql: jest.fn().mockResolvedValue({
    rawResponse: { columns: [], values: [] },
    datatable: makeDatatable(),
  }),
});

const createEsqlFn = (mockSearchService: MockTypedSearchService) =>
  getEsqlFn({
    getStartDependencies: async () => ({
      searchService: mockSearchService as unknown as ISearchMethods,
    }),
  });

describe('getEsqlFn', () => {
  it('returns the datatable from the search service', async () => {
    const mockSearchService = getMockSearchService();
    const esqlFn = createEsqlFn(mockSearchService);

    const result = await esqlFn.fn(null, { query: 'FROM index' }, createExecutionContext());

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('requests columnMetadata, dropNullColumns, and includeExecutionMetadata', async () => {
    const mockSearchService = getMockSearchService();

    await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index' },
      createExecutionContext()
    );

    const [params] = mockSearchService.esql.mock.calls[0];
    expect(params.columnMetadata).toBe(true);
    expect(params.dropNullColumns).toBe(true);
    expect(params.includeExecutionMetadata).toBe(true);
  });

  describe('ignoreGlobalFilters', () => {
    const inputFilter = {
      meta: { alias: null, disabled: false, negate: false },
      query: { match_phrase: { myField: 'uniqueFromFilterPill' } },
    };

    const input: KibanaContext = {
      type: 'kibana_context',
      filters: [inputFilter],
      query: { language: 'kuery', query: 'myField:uniqueFromQueryBar' },
    };

    it('passes global query and filters in the search context when ignoreGlobalFilters is false', async () => {
      const mockSearchService = getMockSearchService();

      await createEsqlFn(mockSearchService).fn(
        input,
        { query: 'FROM index', ignoreGlobalFilters: false },
        createExecutionContext()
      );

      const [params] = mockSearchService.esql.mock.calls[0];
      expect(params.query).toBe('FROM index');
      expect(params.kibanaQueryContext?.kibanaFilters).toEqual([inputFilter]);
      expect(params.kibanaQueryContext?.kqlQuery).toEqual(input.query);
    });

    it('excludes global query and filters when ignoreGlobalFilters is true', async () => {
      const mockSearchService = getMockSearchService();

      await createEsqlFn(mockSearchService).fn(
        input,
        { query: 'FROM index', ignoreGlobalFilters: true },
        createExecutionContext()
      );

      const [params] = mockSearchService.esql.mock.calls[0];
      expect(params.query).toBe('FROM index');
      expect(params.kibanaQueryContext?.kibanaFilters).toEqual([]);
      expect(params.kibanaQueryContext?.kqlQuery).toBeUndefined();
    });
  });

  it('passes the time range, timeField, and control variables in kibanaQueryContext', async () => {
    const mockSearchService = getMockSearchService();
    const timeRange = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' };
    const esqlVariables = [{ key: 'field', value: 'host', type: ESQLVariableType.FIELDS }];

    await createEsqlFn(mockSearchService).fn(
      { type: 'kibana_context', timeRange, esqlVariables },
      { query: 'FROM index | KEEP ??field', timeField: '@timestamp' },
      createExecutionContext()
    );

    const [params] = mockSearchService.esql.mock.calls[0];
    expect(params.query).toBe('FROM index | KEEP ??field');
    expect(params.kibanaQueryContext).toMatchObject({
      timeRange,
      timeField: '@timestamp',
      esqlVariables,
    });
  });
});
