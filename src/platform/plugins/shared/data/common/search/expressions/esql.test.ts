/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, of } from 'rxjs';
import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsqlFn } from './esql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchResponse } from '@kbn/search-types';

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          values: [['value1']],
          columns: [{ name: 'column1', type: 'string' }],
        },
      } as IKibanaSearchResponse<ESQLSearchResponse>)
    );

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        search: mockSearch,
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
    } as unknown as ExecutionContext;

    const result = await firstValueFrom(esqlFn.fn(input, args, context));

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('should use null for cells when the values row is shorter than all_columns', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          all_columns: [
            { name: 'all_null', type: 'long' },
            { name: 'has_data', type: 'long' },
          ],
          columns: [{ name: 'has_data', type: 'long' }],
          values: [[42]],
        },
      } as IKibanaSearchResponse<ESQLSearchResponse>)
    );

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        search: mockSearch,
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === 'dateFormat:tz') return 'UTC';
            return undefined;
          }),
        } as unknown as UiSettingsCommon,
      }),
    });

    const result = await firstValueFrom(
      esqlFn.fn(null, { query: 'FROM test_index | STATS x = MAX(field)' }, {
        abortSignal: new AbortController().signal,
        inspectorAdapters: {},
        getKibanaRequest: jest.fn(),
        getSearchSessionId: jest.fn(),
      } as unknown as ExecutionContext)
    );

    expect(result?.rows).toHaveLength(1);
    const row = result?.rows[0];
    expect(row.all_null).toBeNull();
    expect(row.has_data).toBe(42);
    expect(result?.meta?.statistics?.totalCount).toBe(1);
  });

  it('should produce one row of nulls when values is [[]] and all_columns lists every field', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          all_columns: [
            { name: 'Median', type: 'double' },
            { name: 'AVG(products.base_price)', type: 'double' },
          ],
          columns: [],
          values: [[]],
        },
      } as IKibanaSearchResponse<ESQLSearchResponse>)
    );

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        search: mockSearch,
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === 'dateFormat:tz') return 'UTC';
            return undefined;
          }),
        } as unknown as UiSettingsCommon,
      }),
    });

    const result = await firstValueFrom(
      esqlFn.fn(null, { query: 'FROM test_index | STATS x = MAX(field)' }, {
        abortSignal: new AbortController().signal,
        inspectorAdapters: {},
        getKibanaRequest: jest.fn(),
        getSearchSessionId: jest.fn(),
      } as unknown as ExecutionContext)
    );

    expect(result?.rows).toHaveLength(1);
    const row = result?.rows[0];
    expect(row.Median).toBeNull();
    expect(row['AVG(products.base_price)']).toBeNull();
    expect(result?.meta?.statistics?.totalCount).toBe(0);
  });
});
