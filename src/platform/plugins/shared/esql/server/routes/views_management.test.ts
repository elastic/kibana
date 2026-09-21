/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger, PluginInitializerContext } from '@kbn/core/server';
import { EsqlService } from '@kbn/esql-server-utils';
import { VIEWS_BULK_DELETE_ROUTE, VIEWS_ROUTE } from '@kbn/esql-types';
import { registerGetViewsRoute } from './get_views';
import { registerViewsManagementRoutes } from './views_management';

jest.mock('@kbn/esql-server-utils');

const MockedEsqlService = EsqlService as jest.MockedClass<typeof EsqlService>;

const createMocks = () => {
  const handlers = {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  };
  const router = {
    get: jest.fn((_, handler) => handlers.get.mockImplementation(handler)),
    put: jest.fn((_, handler) => handlers.put.mockImplementation(handler)),
    delete: jest.fn((_, handler) => handlers.delete.mockImplementation(handler)),
    post: jest.fn((_, handler) => handlers.post.mockImplementation(handler)),
  };
  const esql = {
    getView: jest.fn(),
    putView: jest.fn(),
    deleteView: jest.fn(),
  };
  const asCurrentUser = { esql };
  const requestHandlerContext = {
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser } },
    }),
  };
  const response = {
    ok: jest.fn(({ body }) => ({ status: 200, body })),
    notFound: jest.fn(({ body }) => ({ status: 404, body })),
    customError: jest.fn(({ statusCode, body }) => ({ status: statusCode, body })),
  };
  const logger = {
    error: jest.fn(),
  } as unknown as Logger;
  const initializerContext = {
    logger: { get: () => logger },
  } as unknown as PluginInitializerContext;

  return {
    handlers,
    router: router as unknown as IRouter,
    routerMocks: router,
    requestHandlerContext,
    response,
    logger,
    initializerContext,
    asCurrentUser,
    esql,
  };
};

describe('ES|QL views routes', () => {
  const service = {
    getViews: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedEsqlService.mockImplementation(() => service as unknown as EsqlService);
  });

  describe('list route', () => {
    it('returns an empty list when Elasticsearch fails', async () => {
      const mocks = createMocks();
      const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
      service.getViews.mockRejectedValue(error);
      registerGetViewsRoute(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.get(
          mocks.requestHandlerContext,
          { query: { strict: false } },
          mocks.response
        )
      ).resolves.toEqual({
        status: 200,
        body: { views: [] },
      });
      expect(mocks.response.customError).not.toHaveBeenCalled();
    });

    it('preserves Elasticsearch errors for strict management requests', async () => {
      const mocks = createMocks();
      const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
      service.getViews.mockRejectedValue(error);
      registerGetViewsRoute(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.get(mocks.requestHandlerContext, { query: { strict: true } }, mocks.response)
      ).resolves.toEqual({
        status: 403,
        body: { message: 'Forbidden' },
      });
      expect(mocks.response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'Forbidden' },
      });
    });
  });

  describe('management routes', () => {
    it('registers the consolidated route paths', () => {
      const mocks = createMocks();
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      expect(mocks.routerMocks.get).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${VIEWS_ROUTE}/{name}` }),
        expect.any(Function)
      );
      expect(mocks.routerMocks.put).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${VIEWS_ROUTE}/{name}` }),
        expect.any(Function)
      );
      expect(mocks.routerMocks.delete).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${VIEWS_ROUTE}/{name}` }),
        expect.any(Function)
      );
      expect(mocks.routerMocks.post).toHaveBeenCalledWith(
        expect.objectContaining({ path: VIEWS_BULK_DELETE_ROUTE }),
        expect.any(Function)
      );
    });

    it('gets one view through the scoped Elasticsearch client', async () => {
      const mocks = createMocks();
      const view = { name: 'my-view', query: 'FROM logs-*' };
      mocks.esql.getView.mockResolvedValue({ views: [view] });
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.get(
          mocks.requestHandlerContext,
          { params: { name: 'my-view' } },
          mocks.response
        )
      ).resolves.toEqual({ status: 200, body: view });
      expect(mocks.esql.getView).toHaveBeenCalledWith({ name: 'my-view' });
    });

    it('returns not found when an exact-name response is empty', async () => {
      const mocks = createMocks();
      mocks.esql.getView.mockResolvedValue({ views: [] });
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.get(
          mocks.requestHandlerContext,
          { params: { name: 'missing-view' } },
          mocks.response
        )
      ).resolves.toMatchObject({ status: 404 });
    });

    it('returns not found when Elasticsearch returns no response', async () => {
      const mocks = createMocks();
      mocks.esql.getView.mockResolvedValue(undefined);
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.get(
          mocks.requestHandlerContext,
          { params: { name: 'missing-view' } },
          mocks.response
        )
      ).resolves.toMatchObject({ status: 404 });
    });

    it('upserts name, query, and description', async () => {
      const mocks = createMocks();
      mocks.esql.putView.mockResolvedValue({ acknowledged: true });
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.put(
          mocks.requestHandlerContext,
          {
            params: { name: 'my-view' },
            body: { query: 'FROM logs-*', description: 'Logs' },
          },
          mocks.response
        )
      ).resolves.toEqual({ status: 200, body: { acknowledged: true } });
      expect(mocks.esql.putView).toHaveBeenCalledWith({
        name: 'my-view',
        query: 'FROM logs-*',
        body: { description: 'Logs' },
      });
    });

    it('deletes one view', async () => {
      const mocks = createMocks();
      mocks.esql.deleteView.mockResolvedValue({ acknowledged: true });
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await mocks.handlers.delete(
        mocks.requestHandlerContext,
        { params: { name: 'my-view' } },
        mocks.response
      );

      expect(mocks.esql.deleteView).toHaveBeenCalledWith({ name: 'my-view' });
    });

    it('bulk deletes views', async () => {
      const mocks = createMocks();
      mocks.esql.deleteView.mockResolvedValue({ acknowledged: true });
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await mocks.handlers.post(
        mocks.requestHandlerContext,
        { body: { names: ['first-view', 'second-view'] } },
        mocks.response
      );

      expect(mocks.esql.deleteView).toHaveBeenCalledWith({
        name: ['first-view', 'second-view'],
      });
    });

    it('preserves Elasticsearch errors with their status', async () => {
      const mocks = createMocks();
      const error = Object.assign(new Error('Conflict'), { statusCode: 409 });
      mocks.esql.putView.mockRejectedValue(error);
      registerViewsManagementRoutes(mocks.router, mocks.initializerContext);

      await expect(
        mocks.handlers.put(
          mocks.requestHandlerContext,
          {
            params: { name: 'my-view' },
            body: { query: 'FROM logs-*' },
          },
          mocks.response
        )
      ).resolves.toEqual({
        status: 409,
        body: { message: 'Conflict' },
      });
      expect(mocks.logger.error).toHaveBeenCalled();
    });
  });
});
