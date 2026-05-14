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
import type { ITypedSearchService } from '@kbn/search-types';
import type { KibanaContext } from '..';

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const mockTyped = {
      searchESQL: jest.fn().mockResolvedValue({
        rawResponse: {
          values: [['value1']],
          columns: [{ name: 'column1', type: 'string' }],
        },
      }),
    } as unknown as ITypedSearchService;

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        typed: mockTyped,
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === 'dateFormat:tz') return 'UTC';
            return undefined;
          }),
        } as unknown as UiSettingsCommon,
      }),
    });

    const input = null; // Mock input
    const args = {
      query: 'FROM index',
    };

    const context = {
      abortSignal: new AbortController().signal,
      inspectorAdapters: {},
      getKibanaRequest: jest.fn(),
      getSearchSessionId: jest.fn(),
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;

    const result = await esqlFn.fn(input, args, context);

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  describe('ignoreGlobalFilters', () => {
    const makeEsqlFn = (mockTyped: ITypedSearchService) =>
      getEsqlFn({
        getStartDependencies: async () => ({
          typed: mockTyped,
          uiSettings: {
            get: jest.fn((key: string) => {
              if (key === 'dateFormat:tz') return 'UTC';
              return undefined;
            }),
          } as unknown as UiSettingsCommon,
        }),
      });

    const makeContext = () =>
      ({
        abortSignal: new AbortController().signal,
        inspectorAdapters: {},
        getKibanaRequest: jest.fn(),
        getSearchSessionId: jest.fn(),
        getExecutionContext: jest.fn(),
      } as unknown as ExecutionContext);

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
      const mockSearchESQL = jest.fn().mockResolvedValue({
        rawResponse: { values: [], columns: [] },
      });
      const mockTyped = { searchESQL: mockSearchESQL } as unknown as ITypedSearchService;
      const esqlFn = makeEsqlFn(mockTyped);

      await esqlFn.fn(input, { query: 'FROM index', ignoreGlobalFilters: false }, makeContext());

      const params = mockSearchESQL.mock.calls[0][0];
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).toContain('uniqueFromFilterPill');
      expect(filterJson).toContain('uniqueFromQueryBar');
    });

    it('should exclude global query and filters from params.filter when ignoreGlobalFilters is true', async () => {
      const mockSearchESQL = jest.fn().mockResolvedValue({
        rawResponse: { values: [], columns: [] },
      });
      const mockTyped = { searchESQL: mockSearchESQL } as unknown as ITypedSearchService;
      const esqlFn = makeEsqlFn(mockTyped);

      await esqlFn.fn(input, { query: 'FROM index', ignoreGlobalFilters: true }, makeContext());

      const params = mockSearchESQL.mock.calls[0][0];
      expect(params.query).toBe('FROM index');
      const filterJson = JSON.stringify(params.filter);
      expect(filterJson).not.toContain('uniqueFromFilterPill');
      expect(filterJson).not.toContain('uniqueFromQueryBar');
    });
  });
});
