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
import * as jsonEofException from '../../../common/search/test_data/json_e_o_f_exception.json';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';

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

  it('handler returns an error response if the search throws an error', async () => {
    const rejectedValue = Promise.reject(
      new ResponseError({
        body: jsonEofException,
        statusCode: 400,
        meta: {} as any,
        headers: [],
        warnings: [],
      })
    );
    const mockClient = {
      msearch: jest.fn().mockReturnValue(rejectedValue),
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

    expect(mockClient.msearch).toBeCalledTimes(1);
    expect(mockResponse.customError).toBeCalled();

    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.body.message).toBe('json_e_o_f_exception');
    expect(error.body.attributes).toBe(jsonEofException.error);
  });

  it('handler returns an error response if the search throws a general error', async () => {
    const rejectedValue = Promise.reject(new Error('What happened?'));
    const mockClient = {
      msearch: jest.fn().mockReturnValue(rejectedValue),
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

    expect(mockClient.msearch).toBeCalledTimes(1);
    expect(mockResponse.customError).toBeCalled();

    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(500);
    expect(error.body.message).toBe('What happened?');
    expect(error.body.attributes).toBe(undefined);
  });
});
