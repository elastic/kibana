/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { from } from 'rxjs';
import { CoreSetup, RequestHandlerContext } from 'src/core/server';
import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { registerSearchRoute } from './search';
import { DataPluginStart } from '../../plugin';

describe('Search service', () => {
  let mockCoreSetup: MockedKeys<CoreSetup<{}, DataPluginStart>>;

  beforeEach(() => {
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

    registerSearchRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockContext.search.search).toBeCalled();
    expect(mockContext.search.search.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: response,
    });
  });

  it('handler throws an error if the search throws an error', async () => {
    const rejectedValue = from(
      Promise.reject({
        message: 'oh no',
        body: {
          error: 'oops',
        },
      })
    );

    const mockContext = {
      search: {
        search: jest.fn().mockReturnValue(rejectedValue),
      },
    };

    const mockBody = { id: undefined, params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerSearchRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockContext.search.search).toBeCalled();
    expect(mockContext.search.search.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockResponse.customError).toBeCalled();
    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.body.message).toBe('oh no');
    expect(error.body.attributes.error).toBe('oops');
  });
});
