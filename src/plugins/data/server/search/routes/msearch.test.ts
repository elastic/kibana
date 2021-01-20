/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
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
import { convertRequestBody } from './call_msearch';
import { registerMsearchRoute } from './msearch';
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
    const mockClient = { msearch: jest.fn().mockResolvedValue(response) };
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

    expect(mockClient.msearch.mock.calls[0][0].body).toEqual(
      convertRequestBody(mockBody as any, {})
    );
    expect(mockClient.msearch.mock.calls[0][1].querystring).toMatchInlineSnapshot(`
      Object {
        "ignore_unavailable": true,
        "max_concurrent_shard_requests": undefined,
      }
    `);
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
      msearch: jest.fn().mockReturnValue(Promise.reject(response)),
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

    expect(mockClient.msearch).toBeCalled();
    expect(mockResponse.customError).toBeCalled();

    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.body.message).toBe('oh no');
    expect(error.body.attributes.error).toBe('oops');
  });
});
