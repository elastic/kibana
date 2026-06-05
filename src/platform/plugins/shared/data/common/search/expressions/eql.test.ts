/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEqlFn } from './eql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { KibanaContext } from '..';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DataViewsContract } from '../..';

interface MockTypedSearchService {
  eql: jest.Mock<Promise<{ rawResponse: any }>, [any, any?]>;
}

const mockUiSettings = (): UiSettingsCommon =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'query:allowLeadingWildcards') return true;
      if (key === 'query:queryString:options') return {};
      if (key === 'courier:ignoreFilterIfFieldNotInIndex') return false;
      return undefined;
    }),
  } as unknown as UiSettingsCommon);

const mockDataViews = (): DataViewsContract =>
  ({
    create: jest.fn().mockResolvedValue({
      id: 'mock-dataview-id',
      title: 'test-index',
    }),
  } as unknown as DataViewsContract);

const createExecutionContext = (inspectorAdapter?: RequestAdapter): ExecutionContext =>
  ({
    abortSignal: new AbortController().signal,
    inspectorAdapters: {
      requests: inspectorAdapter ?? new RequestAdapter(),
    },
    getKibanaRequest: jest.fn(),
    getSearchSessionId: jest.fn(),
    getExecutionContext: jest.fn(),
  } as unknown as ExecutionContext);

const getMockSearchService = (
  rawResponse: any = { hits: { events: [] } }
): MockTypedSearchService => {
  const mockTyped = {
    eql: jest.fn().mockResolvedValue({
      rawResponse,
    }),
  } as unknown as MockTypedSearchService;

  return mockTyped;
};

const createEqlFn = (mockSearchService: MockTypedSearchService) =>
  getEqlFn({
    getStartDependencies: async () => ({
      searchService: mockSearchService as unknown as ISearchMethods,
      uiSettingsClient: mockUiSettings(),
      dataViews: mockDataViews(),
    }),
  });

describe('getEqlFn', () => {
  it('calls searchService.eql with correct parameters', async () => {
    const mockSearchService = getMockSearchService();
    const eqlFn = createEqlFn(mockSearchService);

    await eqlFn.fn(
      null,
      {
        query: 'process where process.name == "regsvr32.exe"',
        index: 'test-index',
        size: 20,
        field: ['process.name', 'user.name'],
      },
      createExecutionContext()
    );

    expect(mockSearchService.eql).toHaveBeenCalledWith(
      {
        index: 'test-index',
        query: 'process where process.name == "regsvr32.exe"',
        size: 20,
        fields: ['process.name', 'user.name'],
        filter: undefined,
      },
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        inspector: expect.objectContaining({
          adapter: expect.any(RequestAdapter),
          title: 'Data',
        }),
      })
    );
  });

  it('passes inspector configuration to searchService.eql', async () => {
    const mockSearchService = getMockSearchService();
    const eqlFn = createEqlFn(mockSearchService);
    const inspectorAdapter = new RequestAdapter();

    await eqlFn.fn(
      null,
      { query: 'any where true', index: 'test-index', size: 10, field: [] },
      createExecutionContext(inspectorAdapter)
    );

    expect(mockSearchService.eql).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        inspector: expect.objectContaining({
          adapter: inspectorAdapter,
          title: 'Data',
          description: expect.stringContaining('This request queries Elasticsearch'),
          getRequestStats: expect.any(Function),
        }),
      })
    );
  });

  it('merges input filters into EQL filter parameter', async () => {
    const mockSearchService = getMockSearchService();
    const eqlFn = createEqlFn(mockSearchService);

    const input: KibanaContext = {
      type: 'kibana_context',
      filters: [],
      query: {
        language: 'lucene',
        query: '*',
      },
    };

    await eqlFn.fn(
      input,
      { query: 'any where true', index: 'test-index', size: 10, field: [] },
      createExecutionContext()
    );

    const callArgs = mockSearchService.eql.mock.calls[0][0];
    expect(callArgs.filter).toBeDefined();
  });

  it('returns eql_raw_response type', async () => {
    const rawResponse = { hits: { events: [{ _id: '1', _source: { field: 'value' } }] } };
    const mockSearchService = getMockSearchService(rawResponse);
    const eqlFn = createEqlFn(mockSearchService);

    const result = await eqlFn.fn(
      null,
      { query: 'any where true', index: 'test-index', size: 10, field: [] },
      createExecutionContext()
    );

    expect(result).toEqual({
      type: 'eql_raw_response',
      body: rawResponse,
    });
  });

  it('uses default size parameter when not explicitly set', async () => {
    const mockSearchService = getMockSearchService();
    const eqlFn = createEqlFn(mockSearchService);

    await eqlFn.fn(
      null,
      { query: 'any where true', index: 'test-index', size: 10, field: [] },
      createExecutionContext()
    );

    expect(mockSearchService.eql).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 10,
      }),
      expect.any(Object)
    );
  });

  it('handles field parameter correctly', async () => {
    const mockSearchService = getMockSearchService();
    const eqlFn = createEqlFn(mockSearchService);

    await eqlFn.fn(
      null,
      {
        query: 'any where true',
        index: 'test-index',
        size: 10,
        field: ['field1', 'field2', 'field3'],
      },
      createExecutionContext()
    );

    expect(mockSearchService.eql).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['field1', 'field2', 'field3'],
      }),
      expect.any(Object)
    );
  });
});
