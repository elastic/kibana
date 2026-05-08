/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsqlFn } from './esql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { KibanaContext } from '..';

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

const createEsqlFn = (mockSearch: jest.Mock) =>
  getEsqlFn({
    getStartDependencies: async () => ({
      search: mockSearch,
      uiSettings: mockUiSettings(),
    }),
  });

const mockRawSearchObservable = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][] = [['v1']]
) =>
  of({
    rawResponse: {
      values,
      columns,
    },
  } as IKibanaSearchResponse<ESQLSearchResponse>);

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const mockSearch = jest
      .fn()
      .mockReturnValue(
        mockRawSearchObservable([{ name: 'column1', type: 'string' }], [['value1']])
      );

    const esqlFn = createEsqlFn(mockSearch);

    const result = await esqlFn
      .fn(null, { query: 'FROM index' }, createExecutionContext())
      .toPromise();

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

    const emptySearchResponse = of({
      rawResponse: { values: [], columns: [] },
    } as unknown as IKibanaSearchResponse<ESQLSearchResponse>);

    it('should include global query and filters in params.filter when ignoreGlobalFilters is false', async () => {
      const mockSearch = jest.fn().mockReturnValue(emptySearchResponse);

      await createEsqlFn(mockSearch)
        .fn(input, { query: 'FROM index', ignoreGlobalFilters: false }, createExecutionContext())
        .toPromise();

      const params = mockSearch.mock.calls[0][0].params;
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).toContain('uniqueFromFilterPill');
      expect(filterJson).toContain('uniqueFromQueryBar');
    });

    it('should exclude global query and filters from params.filter when ignoreGlobalFilters is true', async () => {
      const mockSearch = jest.fn().mockReturnValue(emptySearchResponse);

      await createEsqlFn(mockSearch)
        .fn(input, { query: 'FROM index', ignoreGlobalFilters: true }, createExecutionContext())
        .toPromise();

      const params = mockSearch.mock.calls[0][0].params;
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).not.toContain('uniqueFromFilterPill');
      expect(filterJson).not.toContain('uniqueFromQueryBar');
    });
  });

  it('resolves meta.sourceParams.sourceField through RENAME to the underlying field', async () => {
    const mockSearch = jest
      .fn()
      .mockReturnValue(mockRawSearchObservable([{ name: 'new_name', type: 'keyword' }]));

    const result = await createEsqlFn(mockSearch)
      .fn(null, { query: 'FROM index | RENAME old_name AS new_name' }, createExecutionContext())
      .toPromise();

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('old_name');
    expect(result?.columns?.[0]?.name).toBe('new_name');
  });

  it('keeps meta.sourceParams.sourceField as the ES column name without RENAME', async () => {
    const mockSearch = jest
      .fn()
      .mockReturnValue(mockRawSearchObservable([{ name: 'host', type: 'keyword' }]));

    const result = await createEsqlFn(mockSearch)
      .fn(null, { query: 'FROM index' }, createExecutionContext())
      .toPromise();

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('host');
  });

  it('resolves chained RENAME pipeline for meta.sourceParams.sourceField', async () => {
    const mockSearch = jest
      .fn()
      .mockReturnValue(mockRawSearchObservable([{ name: 'c', type: 'keyword' }]));

    const result = await createEsqlFn(mockSearch)
      .fn(null, { query: 'FROM index | RENAME a AS b | RENAME b AS c' }, createExecutionContext())
      .toPromise();

    expect(result?.columns?.[0]?.meta?.sourceParams?.sourceField).toBe('a');
    expect(result?.columns?.[0]?.name).toBe('c');
  });

  it('resolves meta.sourceParams.sourceField for STATS BY alias = column', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      mockRawSearchObservable([
        { name: 'cnt', type: 'long' },
        { name: 'region', type: 'keyword' },
      ])
    );

    const query = 'FROM index | STATS cnt = COUNT(*) BY region = country';
    const result = await createEsqlFn(mockSearch)
      .fn(null, { query }, createExecutionContext())
      .toPromise();

    const regionColumn = result?.columns?.find((col) => col.name === 'region');
    expect(regionColumn?.meta?.sourceParams?.sourceField).toBe('country');
    expect(
      result?.columns?.find((col) => col.name === 'cnt')?.meta?.sourceParams?.sourceField
    ).toBe('cnt');
  });
});
