/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { httpServiceMock, httpServerMock } from '../../../../../src/core/server/mocks';
import { registerSearchRoute } from './routes';
import { IRouter, ScopedClusterClient, RequestHandlerContext } from 'kibana/server';

describe('Search service', () => {
  let routerMock: jest.Mocked<IRouter>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter();
  });

  it('registers a post route', async () => {
    registerSearchRoute(routerMock);
    expect(routerMock.post).toBeCalled();
  });

  it('handler calls context.search.search with the given request and strategy', async () => {
    const mockSearch = jest.fn().mockResolvedValue('yay');
    const mockContext = {
      core: {
        elasticsearch: {
          dataClient: {} as ScopedClusterClient,
          adminClient: {} as ScopedClusterClient,
        },
      },
      search: {
        search: mockSearch,
      },
    };
    const mockBody = { params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerSearchRoute(routerMock);
    const handler = routerMock.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockSearch).toBeCalled();
    expect(mockSearch.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockSearch.mock.calls[0][2]).toBe(mockParams.strategy);
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: 'yay' });
  });

  it('handler throws an error if the search throws an error', async () => {
    const mockSearch = jest.fn().mockRejectedValue('oh no');
    const mockContext = {
      core: {
        elasticsearch: {
          dataClient: {} as ScopedClusterClient,
          adminClient: {} as ScopedClusterClient,
        },
      },
      search: {
        search: mockSearch,
      },
    };
    const mockBody = { params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerSearchRoute(routerMock);
    const handler = routerMock.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockSearch).toBeCalled();
    expect(mockSearch.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockSearch.mock.calls[0][2]).toBe(mockParams.strategy);
    expect(mockResponse.customError).toBeCalled();
    expect(mockResponse.customError.mock.calls[0][0]).toEqual({ body: 'oh no' });
  });
});
