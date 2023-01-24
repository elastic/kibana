/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';

import type { CoreSetup, Logger } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { PluginStart as DataPluginStart } from '../..';
import { dataPluginMock } from '../../mocks';

import { registerSessionRoutes } from './session';

enum PostHandlerIndex {
  SAVE,
  FIND,
  CANCEL,
  EXTEND,
}

describe('registerSessionRoutes', () => {
  let mockCoreSetup: MockedKeys<CoreSetup<{}, DataPluginStart>>;
  let mockContext: ReturnType<typeof dataPluginMock.createRequestHandlerContext>;
  let mockLogger: Logger;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockLogger = coreMock.createPluginInitializerContext().logger.get();
    mockContext = dataPluginMock.createRequestHandlerContext();
    registerSessionRoutes(mockCoreSetup.http.createRouter(), mockLogger);
  });

  it('save calls saveSession with sessionId and attributes', async () => {
    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const name = 'my saved background search session';
    const body = { sessionId, name };

    const mockRequest = httpServerMock.createKibanaRequest({ body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, saveHandler] = mockRouter.post.mock.calls[PostHandlerIndex.SAVE];

    await saveHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.saveSession).toHaveBeenCalledWith(sessionId, { name });
  });

  it('get calls getSession with sessionId', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[, getHandler]] = mockRouter.get.mock.calls;

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.getSession).toHaveBeenCalledWith(id);
  });

  it('status calls getSessionStatus with sessionId', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [[], [, statusHandler]] = mockRouter.get.mock.calls;

    await statusHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.getSessionStatus).toHaveBeenCalledWith(id);
  });

  it('find calls findSession with options', async () => {
    const page = 1;
    const perPage = 5;
    const sortField = 'my_field';
    const sortOrder = 'desc';
    const filter = 'foo: bar';
    const body = { page, perPage, sortField, sortOrder, filter };

    const mockRequest = httpServerMock.createKibanaRequest({ body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, findHandler] = mockRouter.post.mock.calls[PostHandlerIndex.FIND];

    await findHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.findSessions).toHaveBeenCalledWith(body);
  });

  it('update calls updateSession with id and attributes', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const name = 'my saved background search session';
    const expires = new Date().toISOString();
    const params = { id };
    const body = { name, expires };

    const mockRequest = httpServerMock.createKibanaRequest({ params, body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, updateHandler] = mockRouter.put.mock.calls[0];

    await updateHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.updateSession).toHaveBeenCalledWith(id, body);
  });

  it('cancel calls cancelSession with id', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, cancelHandler] = mockRouter.post.mock.calls[PostHandlerIndex.CANCEL];

    await cancelHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.cancelSession).toHaveBeenCalledWith(id);
  });

  it('delete calls deleteSession with id', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const params = { id };

    const mockRequest = httpServerMock.createKibanaRequest({ params });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, deleteHandler] = mockRouter.delete.mock.calls[0];

    await deleteHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search!.deleteSession).toHaveBeenCalledWith(id);
  });

  it('extend calls extendSession with id', async () => {
    const id = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const expires = new Date().toISOString();
    const params = { id };
    const body = { expires };

    const mockRequest = httpServerMock.createKibanaRequest({ params, body });
    const mockResponse = httpServerMock.createResponseFactory();

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const [, extendHandler] = mockRouter.post.mock.calls[PostHandlerIndex.EXTEND];

    await extendHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.search.extendSession).toHaveBeenCalledWith(id, new Date(expires));
  });
});
