/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { registerGetNpreValueRoute } from './get_npre_value';
import { NpreClient } from '../npre/npre_client';

jest.mock('../npre/npre_client');

describe('get_npre_value route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createHandler = () => {
    const router = coreMock.createSetup().http.createRouter();
    registerGetNpreValueRoute(router, coreMock.createPluginInitializerContext());
    const handler = (router.get as jest.Mock).mock.calls[0][1];
    const routeConfig = (router.get as jest.Mock).mock.calls[0][0];
    return { handler, routeConfig };
  };

  it('registers route with required privileges', () => {
    const { routeConfig } = createHandler();

    expect(routeConfig.path).toBe('/internal/cps/project_routing/{projectRoutingName}');
    expect(routeConfig.security?.authz).toEqual({
      requiredPrivileges: ['cluster:monitor/project_routing/get'],
    });
  });

  it('returns the raw npre value', async () => {
    (NpreClient as unknown as jest.Mock).mockImplementation(() => ({
      getNpre: jest.fn().mockResolvedValue('project:test'),
    }));

    const { handler } = createHandler();

    const mockContext = {
      core: Promise.resolve(coreMock.createStart()),
    } as any;

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { projectRoutingName: 'test-expression' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: 'project:test' });
  });

  it('returns 404 when expression is missing', async () => {
    (NpreClient as unknown as jest.Mock).mockImplementation(() => ({
      getNpre: jest.fn().mockResolvedValue(undefined),
    }));

    const { handler } = createHandler();

    const mockContext = {
      core: Promise.resolve(coreMock.createStart()),
    } as any;

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { projectRoutingName: 'missing' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalled();
  });

  it('propagates non-404 errors', async () => {
    const error = new Error('boom');

    (NpreClient as unknown as jest.Mock).mockImplementation(() => ({
      getNpre: jest.fn().mockRejectedValue(error),
    }));

    const { handler } = createHandler();

    const mockContext = {
      core: Promise.resolve(coreMock.createStart()),
    } as any;

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { projectRoutingName: 'test-expression' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await expect(handler(mockContext, mockRequest, mockResponse)).rejects.toThrow('boom');
  });
});
