/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import { from } from 'rxjs';
import { CoreSetup, RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { registerSearchRoute } from './search';
import { DataPluginStart } from '../../plugin';
import * as searchPhaseException from '../../../common/search/test_data/search_phase_execution_exception.json';
import * as indexNotFoundException from '../../../common/search/test_data/index_not_found_exception.json';
import { KbnSearchError } from '../report_search_error';

describe('Search service', () => {
  let mockCoreSetup: MockedKeys<CoreSetup<{}, DataPluginStart>>;

  function mockEsError(message: string, statusCode: number, errBody?: Record<string, any>) {
    return new KbnSearchError(message, statusCode, errBody);
  }

  async function runMockSearch(mockContext: any, mockRequest: any, mockResponse: any) {
    registerSearchRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);
  }

  async function runMockDelete(mockContext: any, mockRequest: any, mockResponse: any) {
    registerSearchRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.versioned.delete.mock.results[0].value.addVersion.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreSetup = coreMock.createSetup();
  });

  it('handler calls context.search.search with the given request and strategy', async () => {
    const response = {
      id: 'yay',
      rawResponse: {
        took: 100,
        timed_out: true,
        _shards: {
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 0,
          max_score: 0,
          hits: [],
        },
      },
    };

    const mockContext = {
      search: {
        search: jest.fn().mockReturnValue(from(Promise.resolve(response))),
      },
    };

    const mockBody = { id: undefined, params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await runMockSearch(mockContext, mockRequest, mockResponse);

    expect(mockContext.search.search).toBeCalled();
    expect(mockContext.search.search.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: response,
    });
  });

  it('handler returns an error response if the search throws a painless error', async () => {
    const rejectedValue = from(
      Promise.reject(mockEsError('search_phase_execution_exception', 400, searchPhaseException))
    );

    const mockContext = {
      search: {
        search: jest.fn().mockReturnValue(rejectedValue),
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { id: undefined, params: {} },
      params: { strategy: 'foo' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await runMockSearch(mockContext, mockRequest, mockResponse);

    // verify error
    expect(mockResponse.customError).toBeCalled();
    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.body.message).toBe('search_phase_execution_exception');
    expect(error.body.attributes).toEqual({
      error: searchPhaseException.error,
      rawResponse: undefined,
    });
  });

  it('handler returns an error response if the search throws an index not found error', async () => {
    const rejectedValue = from(
      Promise.reject(mockEsError('index_not_found_exception', 404, indexNotFoundException))
    );

    const mockContext = {
      search: {
        search: jest.fn().mockReturnValue(rejectedValue),
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { id: undefined, params: {} },
      params: { strategy: 'foo' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await runMockSearch(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toBeCalled();
    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.body.message).toBe('index_not_found_exception');
    expect(error.body.attributes).toEqual({
      error: indexNotFoundException.error,
      rawResponse: undefined,
    });
  });

  it('handler returns an error response if the search throws a general error', async () => {
    const rejectedValue = from(Promise.reject(new Error('This is odd')));

    const mockContext = {
      search: {
        search: jest.fn().mockReturnValue(rejectedValue),
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { id: undefined, params: {} },
      params: { strategy: 'foo' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await runMockSearch(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toBeCalled();
    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(500);
    expect(error.body.message).toBe('This is odd');
    expect(error.body.attributes).toBe(undefined);
  });

  it('DELETE request calls cancel with the given ID and strategy', async () => {
    const mockContext = {
      search: {
        cancel: jest.fn(),
      },
    };

    const id = '1234';
    const strategy = 'foo';
    const params = { id, strategy };

    const mockRequest = httpServerMock.createKibanaRequest({
      params,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await runMockDelete(mockContext, mockRequest, mockResponse);

    expect(mockContext.search.cancel).toBeCalled();
    expect(mockContext.search.cancel).toBeCalledWith(id, { strategy });
  });
});
