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

import { Observable } from 'rxjs';

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
import { registerMsearchRoute, convertRequestBody } from './msearch';
import { DataPluginStart } from '../../plugin';
import { dataPluginMock } from '../../mocks';

describe('msearch route', () => {
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

  it('handler calls /_msearch with the given request', async () => {
    const response = { id: 'yay', body: { responses: [{ hits: { total: 5 } }] } };
    const mockClient = { transport: { request: jest.fn().mockResolvedValue(response) } };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
        uiSettings: { client: { get: jest.fn() } },
      },
    };
    const mockBody = { searches: [{ header: {}, body: {} }] };
    const mockQuery = {};
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      query: mockQuery,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerMsearchRoute(mockCoreSetup.http.createRouter(), { getStartServices, globalConfig$ });

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.transport.request.mock.calls[0][0].method).toBe('GET');
    expect(mockClient.transport.request.mock.calls[0][0].path).toBe('/_msearch');
    expect(mockClient.transport.request.mock.calls[0][0].body).toEqual(
      convertRequestBody(mockBody as any, {})
    );
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: response,
    });
  });

  it('handler throws an error if the search throws an error', async () => {
    const response = {
      message: 'oh no',
      body: {
        error: 'oops',
      },
    };
    const mockClient = {
      transport: { request: jest.fn().mockReturnValue(Promise.reject(response)) },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
        uiSettings: { client: { get: jest.fn() } },
      },
    };
    const mockBody = { searches: [{ header: {}, body: {} }] };
    const mockQuery = {};
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      query: mockQuery,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerMsearchRoute(mockCoreSetup.http.createRouter(), { getStartServices, globalConfig$ });

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler((mockContext as unknown) as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.transport.request).toBeCalled();
    expect(mockResponse.customError).toBeCalled();

    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.body.message).toBe('oh no');
    expect(error.body.attributes.error).toBe('oops');
  });

  describe('convertRequestBody', () => {
    it('combines header & body into proper msearch request', () => {
      const request = {
        searches: [{ header: { index: 'foo', preference: 0 }, body: { test: true } }],
      };
      expect(convertRequestBody(request, { timeout: '30000ms' })).toMatchInlineSnapshot(`
        "{\\"ignore_unavailable\\":true,\\"index\\":\\"foo\\",\\"preference\\":0}
        {\\"timeout\\":\\"30000ms\\",\\"test\\":true}
        "
      `);
    });

    it('handles multiple searches', () => {
      const request = {
        searches: [
          { header: { index: 'foo', preference: 0 }, body: { test: true } },
          { header: { index: 'bar', preference: 1 }, body: { hello: 'world' } },
        ],
      };
      expect(convertRequestBody(request, { timeout: '30000ms' })).toMatchInlineSnapshot(`
        "{\\"ignore_unavailable\\":true,\\"index\\":\\"foo\\",\\"preference\\":0}
        {\\"timeout\\":\\"30000ms\\",\\"test\\":true}
        {\\"ignore_unavailable\\":true,\\"index\\":\\"bar\\",\\"preference\\":1}
        {\\"timeout\\":\\"30000ms\\",\\"hello\\":\\"world\\"}
        "
      `);
    });
  });
});
