/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsdslFn } from './esdsl';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { KibanaContext } from '..';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

interface MockTypedSearchService {
  dsl: jest.Mock<Promise<{ rawResponse: any }>, [any, any?]>;
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
  rawResponse: any = { hits: { hits: [] } }
): MockTypedSearchService => {
  const mockTyped = {
    dsl: jest.fn().mockResolvedValue({
      rawResponse,
    }),
  } as unknown as MockTypedSearchService;

  return mockTyped;
};

const createEsdslFn = (mockSearchService: MockTypedSearchService) =>
  getEsdslFn({
    getStartDependencies: async () => ({
      searchService: mockSearchService as unknown as ISearchMethods,
      uiSettingsClient: mockUiSettings(),
    }),
  });

describe('getEsdslFn', () => {
  it('calls searchService.dsl with correct parameters', async () => {
    const mockSearchService = getMockSearchService();
    const esdslFn = createEsdslFn(mockSearchService);

    const dsl = JSON.stringify({ query: { match_all: {} } });
    await esdslFn.fn(null, { dsl, index: 'test-index', size: 20 }, createExecutionContext());

    expect(mockSearchService.dsl).toHaveBeenCalledWith(
      {
        index: 'test-index',
        size: 20,
        query: { match_all: {} },
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

  it('passes inspector configuration to searchService.dsl', async () => {
    const mockSearchService = getMockSearchService();
    const esdslFn = createEsdslFn(mockSearchService);
    const inspectorAdapter = new RequestAdapter();

    const dsl = JSON.stringify({ query: { match_all: {} } });
    await esdslFn.fn(
      null,
      { dsl, index: 'test-index', size: 10 },
      createExecutionContext(inspectorAdapter)
    );

    expect(mockSearchService.dsl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        inspector: expect.objectContaining({
          adapter: inspectorAdapter,
          title: 'Data',
          description: expect.stringContaining('This request queries Elasticsearch'),
        }),
        getRequestMetadata: expect.any(Function),
      })
    );
  });

  it('merges input filters with DSL query', async () => {
    const mockSearchService = getMockSearchService();
    const esdslFn = createEsdslFn(mockSearchService);

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
    };

    const dsl = JSON.stringify({ query: { term: { field3: 'value3' } } });
    await esdslFn.fn(input, { dsl, index: 'test-index', size: 10 }, createExecutionContext());

    const callArgs = mockSearchService.dsl.mock.calls[0][0];
    expect(callArgs.query).toBeDefined();
    expect(callArgs.query.bool).toBeDefined();
    expect(callArgs.query.bool.must).toContainEqual({ term: { field3: 'value3' } });
  });

  it('returns es_raw_response type', async () => {
    const rawResponse = { hits: { hits: [{ _id: '1', _source: { field: 'value' } }] } };
    const mockSearchService = getMockSearchService(rawResponse);
    const esdslFn = createEsdslFn(mockSearchService);

    const dsl = JSON.stringify({ query: { match_all: {} } });
    const result = await esdslFn.fn(
      null,
      { dsl, index: 'test-index', size: 10 },
      createExecutionContext()
    );

    expect(result).toEqual({
      type: 'es_raw_response',
      body: rawResponse,
    });
  });

  it('uses default size parameter when not provided', async () => {
    const mockSearchService = getMockSearchService();
    const esdslFn = createEsdslFn(mockSearchService);

    const dsl = JSON.stringify({ query: { match_all: {} } });
    await esdslFn.fn(null, { dsl, index: 'test-index', size: 10 }, createExecutionContext());

    expect(mockSearchService.dsl).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 10,
      }),
      expect.any(Object)
    );
  });
});
