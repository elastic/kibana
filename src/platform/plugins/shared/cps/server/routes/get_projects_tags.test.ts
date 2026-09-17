/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';

import { registerProjectTagsRoute } from './get_projects_tags';

describe('get_projects_tags route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createHandler = () => {
    const router = coreMock.createSetup().http.createRouter();
    registerProjectTagsRoute(router, coreMock.createPluginInitializerContext());
    const handler = (router.post as jest.Mock).mock.calls[0][1];
    const routeConfig = (router.post as jest.Mock).mock.calls[0][0];
    return { handler, routeConfig };
  };

  const createContext = () => {
    const core = coreMock.createRequestHandlerContext();
    return {
      context: { core: Promise.resolve(core) } as any,
      esClient: core.elasticsearch.client.asCurrentUser,
    };
  };

  const createResponseError = (statusCode: number) =>
    new errors.ResponseError({
      statusCode,
      body: { error: { type: 'security_exception', reason: 'unauthorized' } },
      warnings: [],
      headers: {},
      meta: {} as any,
    });

  it('registers route with authz delegated to the scoped Elasticsearch client', () => {
    const { routeConfig } = createHandler();

    expect(routeConfig.path).toBe('/internal/cps/projects_tags');
    expect(routeConfig.security?.authz).toEqual({
      enabled: false,
      reason: expect.stringContaining('scoped ES client'),
    });
  });

  it('returns project tags from Elasticsearch', async () => {
    const tags = { origin: { 'origin-id': { _alias: 'origin' } } };

    const { handler } = createHandler();
    const { context, esClient } = createContext();
    esClient.transport.request.mockResolvedValue(tags);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { project_routing: '_alias:*' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await handler(context, mockRequest, mockResponse);

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_project/tags',
      body: { project_routing: '_alias:*' },
    });
    expect(mockResponse.ok).toHaveBeenCalledWith({ body: tags });
  });

  it('returns 403 when the user lacks the required cluster privilege', async () => {
    const { handler } = createHandler();
    const { context, esClient } = createContext();
    esClient.transport.request.mockRejectedValue(createResponseError(403));

    const mockRequest = httpServerMock.createKibanaRequest({});
    const mockResponse = httpServerMock.createResponseFactory();

    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.forbidden).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('read_project_routing'),
      },
    });
  });

  it('propagates non-403 errors', async () => {
    const { handler } = createHandler();
    const { context, esClient } = createContext();
    esClient.transport.request.mockRejectedValue(createResponseError(500));

    const mockRequest = httpServerMock.createKibanaRequest({});
    const mockResponse = httpServerMock.createResponseFactory();

    await expect(handler(context, mockRequest, mockResponse)).rejects.toThrow();
    expect(mockResponse.forbidden).not.toHaveBeenCalled();
  });
});
