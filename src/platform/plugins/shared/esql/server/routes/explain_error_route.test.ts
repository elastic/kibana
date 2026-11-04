/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { EXPLAIN_ERROR_ROUTE } from '@kbn/esql-types';
import { registerExplainErrorRoute } from './explain_error_route';
import type { EsqlServerPluginStart } from '../types';

jest.mock('./helpers', () => ({
  resolveConnectorId: jest.fn(),
  createScopedModel: jest.fn(),
}));

const { resolveConnectorId, createScopedModel } = jest.requireMock('./helpers');

function buildMocks() {
  const handler = jest.fn();
  const availabilityHandler = jest.fn();
  const router = {
    get: jest.fn((_, h) => {
      availabilityHandler.mockImplementation(h);
    }),
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
    forbidden: jest.fn((r) => ({ status: 403, ...r })),
    customError: jest.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };
  const getStartServices = jest.fn().mockResolvedValue([{}, { inference: {} }]);
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  registerExplainErrorRoute(
    router as unknown as IRouter,
    getStartServices as unknown as CoreSetup<EsqlServerPluginStart>['getStartServices'],
    context as unknown as PluginInitializerContext
  );

  return {
    router,
    handler,
    availabilityHandler,
    response,
    requestHandlerContext: {},
    request: {
      body: {
        queryString: 'FROM logs | STATS COUNT(*) BY host',
        errorMessage: 'circuit_breaking_exception - Data too large',
      },
      headers: {},
    },
  };
}

const modelReturning = (result: unknown) => {
  const invoke = jest.fn().mockResolvedValue(result);
  createScopedModel.mockResolvedValue({
    chatModel: { withStructuredOutput: jest.fn(() => ({ invoke })) },
  });
  return invoke;
};

describe('registerExplainErrorRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports whether a connector is available without calling the model', async () => {
    const { router, availabilityHandler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: EXPLAIN_ERROR_ROUTE }),
      expect.any(Function)
    );
    await availabilityHandler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { available: true } });
    expect(createScopedModel).not.toHaveBeenCalled();
  });

  it('reports unavailable when no connector can be resolved', async () => {
    const { availabilityHandler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue(undefined);

    await availabilityHandler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { available: false } });
  });

  it('returns the explanation and no query for a resource error', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({
      cause: 'resources',
      summary: ' The cluster ran out of memory. ',
      suggestions: [' Use a bigger instance. ', ''],
      query: '',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        cause: 'resources',
        summary: 'The cluster ran out of memory.',
        suggestions: ['Use a bigger instance.'],
        query: null,
      },
    });
  });

  it('returns a corrected query when it differs from the original', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({
      cause: 'query',
      summary: 'The field is named hostname.',
      suggestions: [],
      query: 'FROM logs | STATS COUNT(*) BY hostname',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ query: 'FROM logs | STATS COUNT(*) BY hostname' }),
    });
  });

  it('drops a corrected query that only differs in whitespace', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({
      cause: 'query',
      summary: 'Nothing to change.',
      suggestions: [],
      query: 'FROM logs\n| STATS COUNT(*)   BY host',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ query: null }),
    });
  });

  it('fails with a bad request when there is no connector', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue(undefined);

    await handler(requestHandlerContext, request, response);

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('answers forbidden for a license error', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockRejectedValue(
      Object.assign(new Error('no license'), { reason: 'license_x' })
    );

    await handler(requestHandlerContext, request, response);

    expect(response.forbidden).toHaveBeenCalled();
  });
});
