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

import { Observable, from } from 'rxjs';

import {
  CoreSetup,
  RequestHandlerContext,
  SharedGlobalConfig,
  StartServicesAccessor,
} from 'src/core/server';
import {
  coreMock,
  httpServerMock,
  pluginInitializerContextConfigMock,
} from '../../../../../../src/core/server/mocks';
import { registerSearchRoute } from './search';
import { DataPluginStart } from '../../plugin';
import { dataPluginMock } from '../../mocks';

describe('Search service', () => {
  let mockDataStart: MockedKeys<DataPluginStart>;
  let mockCoreSetup: MockedKeys<CoreSetup<{}, DataPluginStart>>;
  let getStartServices: jest.Mocked<StartServicesAccessor<{}, DataPluginStart>>;
  let globalConfig$: Observable<SharedGlobalConfig>;

  beforeEach(() => {
    mockDataStart = dataPluginMock.createStartContract();
    mockCoreSetup = coreMock.createSetup({ pluginStartContract: mockDataStart });
    getStartServices = mockCoreSetup.getStartServices;
    globalConfig$ = pluginInitializerContextConfigMock({}).legacy.globalConfig$;
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

    mockDataStart.search.search.mockReturnValue(from(Promise.resolve(response)));
    const mockContext = {};
    const mockBody = { id: undefined, params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerSearchRoute(mockCoreSetup.http.createRouter(), { getStartServices, globalConfig$ });

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockDataStart.search.search).toBeCalled();
    expect(mockDataStart.search.search.mock.calls[0][0]).toStrictEqual(mockBody);
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

    mockDataStart.search.search.mockReturnValue(rejectedValue);

    const mockContext = {};
    const mockBody = { id: undefined, params: {} };
    const mockParams = { strategy: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      params: mockParams,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerSearchRoute(mockCoreSetup.http.createRouter(), { getStartServices, globalConfig$ });

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockDataStart.search.search).toBeCalled();
    expect(mockDataStart.search.search.mock.calls[0][0]).toStrictEqual(mockBody);
    expect(mockResponse.customError).toBeCalled();
    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.body.message).toBe('oh no');
    expect(error.body.attributes.error).toBe('oops');
  });
});
