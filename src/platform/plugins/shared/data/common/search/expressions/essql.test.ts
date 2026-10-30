/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEssqlFn } from './essql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { KibanaContext } from '..';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { NowProviderPublicContract } from '../../../public';

interface MockTypedSearchService {
  sql: jest.Mock<Promise<{ rawResponse: any }>, [any, any?]>;
}

const mockUiSettings = (): UiSettingsCommon =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'query:allowLeadingWildcards') return true;
      if (key === 'query:queryString:options') return {};
      if (key === 'courier:ignoreFilterIfFieldNotInIndex') return false;
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    }),
  } as unknown as UiSettingsCommon);

const mockNowProvider = (): NowProviderPublicContract =>
  ({
    get: jest.fn().mockReturnValue(new Date('2024-01-01T00:00:00Z')),
  } as unknown as NowProviderPublicContract);

const createExecutionContext = (inspectorAdapter?: RequestAdapter): ExecutionContext =>
  ({
    abortSignal: new AbortController().signal,
    inspectorAdapters: {
      requests: inspectorAdapter ?? new RequestAdapter(),
    },
    getKibanaRequest: jest.fn(() => ({ id: 'mock-request-id' })),
    getSearchSessionId: jest.fn(),
    getExecutionContext: jest.fn(),
  } as unknown as ExecutionContext);

const getMockSearchService = (
  rawResponse: any = { columns: [], rows: [] }
): MockTypedSearchService => {
  const mockTyped = {
    sql: jest.fn().mockResolvedValue({
      rawResponse,
    }),
  } as unknown as MockTypedSearchService;

  return mockTyped;
};

const createEssqlFn = (mockSearchService: MockTypedSearchService) =>
  getEssqlFn({
    getStartDependencies: async () => ({
      searchService: mockSearchService as unknown as ISearchMethods,
      uiSettings: mockUiSettings(),
      nowProvider: mockNowProvider(),
    }),
  });

describe('getEssqlFn', () => {
  it('calls searchService.sql with correct parameters', async () => {
    const mockSearchService = getMockSearchService();
    const essqlFn = createEssqlFn(mockSearchService);

    await essqlFn.fn(
      null,
      { query: 'SELECT * FROM test', count: 100, timezone: 'America/New_York' },
      createExecutionContext()
    );

    expect(mockSearchService.sql).toHaveBeenCalledWith(
      {
        query: 'SELECT * FROM test',
        params: undefined,
        fetchSize: 100,
        filter: undefined,
      },
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        timeZone: 'America/New_York',
        inspector: expect.objectContaining({
          adapter: expect.any(RequestAdapter),
          title: 'Data',
        }),
      })
    );
  });

  it('passes inspector configuration to searchService.sql', async () => {
    const mockSearchService = getMockSearchService();
    const essqlFn = createEssqlFn(mockSearchService);
    const inspectorAdapter = new RequestAdapter();

    await essqlFn.fn(
      null,
      { query: 'SELECT * FROM test' },
      createExecutionContext(inspectorAdapter)
    );

    expect(mockSearchService.sql).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        inspector: expect.objectContaining({
          adapter: inspectorAdapter,
          title: 'Data',
          description: expect.stringContaining('This request queries Elasticsearch'),
        }),
      })
    );
  });

  it('merges input filters and time range into SQL filter', async () => {
    const mockSearchService = getMockSearchService();
    const essqlFn = createEssqlFn(mockSearchService);

    const input: KibanaContext = {
      type: 'kibana_context',
      filters: [
        {
          meta: { alias: null, disabled: false, negate: false },
          query: { match_phrase: { field1: 'value1' } },
        },
      ],
      query: {
        language: 'kuery',
        query: 'field2:value2',
      },
      timeRange: {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      },
    };

    await essqlFn.fn(
      input,
      { query: 'SELECT * FROM test', timeField: '@timestamp' },
      createExecutionContext()
    );

    const callArgs = mockSearchService.sql.mock.calls[0][0];
    expect(callArgs.filter).toBeDefined();
    expect(callArgs.filter.bool).toBeDefined();
  });

  it('returns datatable type with mapped columns', async () => {
    const rawResponse = {
      columns: [
        { name: 'field1', type: 'keyword' },
        { name: 'count()', type: 'long' },
      ],
      rows: [
        ['value1', 10],
        ['value2', 20],
      ],
    };
    const mockSearchService = getMockSearchService(rawResponse);
    const essqlFn = createEssqlFn(mockSearchService);

    const result = await essqlFn.fn(
      null,
      { query: 'SELECT field1, count(*) FROM test GROUP BY field1' },
      createExecutionContext()
    );

    expect(result?.type).toBe('datatable');
    expect(result?.meta?.type).toBe('essql');
    expect(result?.columns).toHaveLength(2);
    expect(result?.columns?.[0]).toMatchObject({
      id: 'field1',
      name: 'field1',
      meta: { type: 'string' },
    });
    expect(result?.columns?.[1]).toMatchObject({
      id: 'count__',
      name: 'count__',
      meta: { type: 'number' },
    });
    expect(result?.rows).toHaveLength(2);
  });

  it('transforms error messages correctly for parsing_exception', async () => {
    const mockSearchService = getMockSearchService();
    mockSearchService.sql.mockRejectedValue({
      message: 'Original error',
      attributes: {
        type: 'parsing_exception',
        reason: 'Invalid SQL syntax',
      },
    });

    const essqlFn = createEssqlFn(mockSearchService);

    await expect(
      essqlFn.fn(null, { query: 'INVALID SQL' }, createExecutionContext())
    ).rejects.toMatchObject({
      message: expect.stringContaining("Couldn't parse Elasticsearch SQL query"),
    });
  });

  it('transforms error messages correctly for generic elasticsearch errors', async () => {
    const mockSearchService = getMockSearchService();
    mockSearchService.sql.mockRejectedValue({
      message: 'Original error',
      attributes: {
        type: 'search_phase_execution_exception',
        reason: 'Something went wrong',
      },
    });

    const essqlFn = createEssqlFn(mockSearchService);

    await expect(
      essqlFn.fn(null, { query: 'SELECT * FROM test' }, createExecutionContext())
    ).rejects.toMatchObject({
      message: expect.stringContaining('Unexpected error from Elasticsearch'),
    });
  });

  it('applies provided parameter values', async () => {
    const mockSearchService = getMockSearchService();
    const essqlFn = createEssqlFn(mockSearchService);

    // Test that when we explicitly provide count and timezone, they are used
    await essqlFn.fn(
      null,
      { query: 'SELECT * FROM test', count: 500, timezone: 'America/New_York' },
      createExecutionContext()
    );

    expect(mockSearchService.sql).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchSize: 500,
      }),
      expect.objectContaining({
        timeZone: 'America/New_York',
      })
    );
  });

  it('handles parameter array correctly', async () => {
    const mockSearchService = getMockSearchService();
    const essqlFn = createEssqlFn(mockSearchService);

    await essqlFn.fn(
      null,
      { query: 'SELECT * FROM test WHERE field = ?', parameter: ['value1', 42, true] },
      createExecutionContext()
    );

    expect(mockSearchService.sql).toHaveBeenCalledWith(
      expect.objectContaining({
        params: ['value1', 42, true],
      }),
      expect.any(Object)
    );
  });
});
