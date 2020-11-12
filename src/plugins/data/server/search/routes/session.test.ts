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

import type { MockedKeys } from '@kbn/utility-types/jest';
import type { CoreSetup, RequestHandlerContext } from 'kibana/server';
import type { DataPluginStart } from '../../plugin';
import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { createSearchRequestHandlerContext } from '../mocks';
import { registerSessionRoutes } from './session';

describe('registerSessionRoutes', () => {
  let mockCoreSetup: MockedKeys<CoreSetup<{}, DataPluginStart>>;
  let mockContext: jest.Mocked<RequestHandlerContext>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockContext = createSearchRequestHandlerContext();
    registerSessionRoutes(mockCoreSetup.http.createRouter());
  });

  it('save calls session.save with sessionId, name, and url', async () => {
    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const name = 'my saved background search session';
    const url = '/path/to/restored/session';
    const body = { sessionId, name, url };

    const mockRequest = httpServerMock.createKibanaRequest({ body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[, saveHandler]] = mockRouter.post.mock.calls;

    saveHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.session.save).toHaveBeenCalledWith(sessionId, name, url);
  });

  it('get calls session.get with sessionId', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[, getHandler]] = mockRouter.get.mock.calls;

    getHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.session.get).toHaveBeenCalledWith(id);
  });

  it('find calls session.find with options', async () => {
    const page = 1;
    const perPage = 5;
    const sortField = 'my_field';
    const sortOrder = 'desc';
    const filter = 'foo: bar';
    const body = { page, perPage, sortField, sortOrder, filter };

    const mockRequest = httpServerMock.createKibanaRequest({ body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, [, findHandler]] = mockRouter.post.mock.calls;

    findHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.session.find).toHaveBeenCalledWith(body);
  });

  it('update calls session.update with id, name, url, and expires', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const name = 'my saved background search session';
    const url = '/path/to/restored/session';
    const expires = new Date().toISOString();
    const params = { id };
    const body = { name, url, expires };

    const mockRequest = httpServerMock.createKibanaRequest({ params, body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[, updateHandler]] = mockRouter.put.mock.calls;

    updateHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.session.update).toHaveBeenCalledWith(id, body);
  });

  it('delete calls session.delete with id', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[, deleteHandler]] = mockRouter.delete.mock.calls;

    deleteHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.session.delete).toHaveBeenCalledWith(id);
  });
});
