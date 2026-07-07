/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsqlFn } from './esql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type {
  ISearchMethods,
  IEsqlSearchParams,
  IEsqlSearchOptions,
  IEsqlSearchResult,
} from '@kbn/search-types';
import type { KibanaContext } from '..';

interface MockTypedSearchService {
  esql: jest.Mock<Promise<IEsqlSearchResult>, [IEsqlSearchParams, IEsqlSearchOptions?]>;
}

const mockUiSettings = (): UiSettingsCommon =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    }),
  } as unknown as UiSettingsCommon);

const createExecutionContext = (): ExecutionContext =>
  ({
    abortSignal: new AbortController().signal,
    inspectorAdapters: {},
    getKibanaRequest: jest.fn(),
    getSearchSessionId: jest.fn(),
    getExecutionContext: jest.fn(),
  } as unknown as ExecutionContext);

const getMockSearchService = (
  columns: Array<{ name: string; type: string; _meta?: Record<string, unknown> }>,
  values: unknown[][] = [['v1']]
): MockTypedSearchService => {
  const mockTyped = {
    esql: jest.fn().mockResolvedValue({
      rawResponse: {
        values,
        columns,
      },
    }),
  } as unknown as MockTypedSearchService;

  return mockTyped;
};
const createEsqlFn = (mockSearchService: MockTypedSearchService) =>
  getEsqlFn({
    getStartDependencies: async () => ({
      searchService: mockSearchService as unknown as ISearchMethods,
      uiSettings: mockUiSettings(),
    }),
  });

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const esqlFn = createEsqlFn(
      getMockSearchService([{ name: 'column1', type: 'string' }], [['value1']])
    );

    const result = await esqlFn.fn(null, { query: 'FROM index' }, createExecutionContext());

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  describe('ignoreGlobalFilters', () => {
    const inputFilter = {
      meta: { alias: null, disabled: false, negate: false },
      query: { match_phrase: { myField: 'uniqueFromFilterPill' } },
    };

    const input: KibanaContext = {
      type: 'kibana_context',
      filters: [inputFilter],
      query: {
        language: 'kuery',
        query: 'myField:uniqueFromQueryBar',
      },
    };

    it('should include global query and filters in params.filter when ignoreGlobalFilters is false', async () => {
      const mockSearchService = getMockSearchService([], []);

      await createEsqlFn(mockSearchService).fn(
        input,
        { query: 'FROM index', ignoreGlobalFilters: false },
        createExecutionContext()
      );

      const params = mockSearchService.esql.mock.calls[0][0];
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).toContain('uniqueFromFilterPill');
      expect(filterJson).toContain('uniqueFromQueryBar');
    });

    it('should exclude global query and filters from params.filter when ignoreGlobalFilters is true', async () => {
      const mockSearchService = getMockSearchService([], []);

      await createEsqlFn(mockSearchService).fn(
        input,
        { query: 'FROM index', ignoreGlobalFilters: true },
        createExecutionContext()
      );

      const params = mockSearchService.esql.mock.calls[0][0];
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).not.toContain('uniqueFromFilterPill');
      expect(filterJson).not.toContain('uniqueFromQueryBar');
    });
  });

  it('resolves meta.sourceParams.sourceField through RENAME to the underlying field', async () => {
    const mockSearchService = getMockSearchService([{ name: 'new_name', type: 'keyword' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index | RENAME old_name AS new_name' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('old_name');
    expect(result?.columns?.[0]?.meta?.sourceParams?.isSourceFieldFilterable).toBe(true);
    expect(result?.columns?.[0]?.name).toBe('new_name');
  });

  it('keeps meta.sourceParams.sourceField as the ES column name without RENAME', async () => {
    const mockSearchService = getMockSearchService([{ name: 'host', type: 'keyword' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index' },
      createExecutionContext()
    );

    // A plain pass-through field is its own real, filterable field, even though it was never
    // renamed.
    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('host');
    expect(result?.columns?.[0]?.meta?.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('treats an EVAL-computed field with no rename as not filterable', async () => {
    const mockSearchService = getMockSearchService([{ name: 'doubled', type: 'long' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index | EVAL doubled = bytes * 2' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('doubled');
    expect(result?.columns?.[0]?.meta?.sourceParams?.isSourceFieldFilterable).toBe(false);
  });

  it('treats a METADATA column as filterable, even though it was never renamed', async () => {
    const mockSearchService = getMockSearchService([{ name: '_id', type: 'keyword' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index METADATA _id' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.isComputedColumn).toBe(true);
    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('_id');
    expect(result?.columns?.[0]?.meta?.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('resolves chained RENAME pipeline for meta.sourceParams.sourceField', async () => {
    const mockSearchService = getMockSearchService([{ name: 'c', type: 'keyword' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index | RENAME a AS b | RENAME b AS c' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('a');
    expect(result?.columns?.[0]?.name).toBe('c');
  });

  it('passes ES column _meta through to meta.esMeta', async () => {
    const columnMeta = { approximation: { type: 'count_distinct', column: '@timestamp' } };
    const mockSearchService = getMockSearchService([
      { name: 'count', type: 'long', _meta: columnMeta },
    ]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index | STATS COUNT(DISTINCT @timestamp)' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.meta?.esMeta).toEqual(columnMeta);
  });

  it('omits meta.esMeta when ES column has no _meta', async () => {
    const mockSearchService = getMockSearchService([{ name: 'host', type: 'keyword' }]);

    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query: 'FROM index' },
      createExecutionContext()
    );

    expect(result?.columns?.[0]?.meta?.esMeta).toBeUndefined();
  });

  it('resolves meta.sourceParams.sourceField for STATS BY alias = column', async () => {
    const mockSearchService = getMockSearchService([
      { name: 'cnt', type: 'long' },
      { name: 'region', type: 'keyword' },
    ]);

    const query = 'FROM index | STATS cnt = COUNT(*) BY region = country';
    const result = await createEsqlFn(mockSearchService).fn(
      null,
      { query },
      createExecutionContext()
    );

    const regionColumn = result?.columns?.find((col) => col.name === 'region');
    expect(regionColumn?.meta?.sourceParams?.sourceField).toBe('country');
    expect(
      result?.columns?.find((col) => col.name === 'cnt')?.meta?.sourceParams?.sourceField
    ).toBe('cnt');
  });
});
