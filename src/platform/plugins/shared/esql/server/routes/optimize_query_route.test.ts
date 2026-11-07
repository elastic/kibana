/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import { registerOptimizeQueryRoute } from './optimize_query_route';
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

  registerOptimizeQueryRoute(
    router as unknown as IRouter,
    getStartServices as unknown as CoreSetup<EsqlServerPluginStart>['getStartServices'],
    context as unknown as PluginInitializerContext
  );

  return {
    router,
    handler,
    availabilityHandler,
    response,
    requestHandlerContext: { core: Promise.resolve({}) },
    request: {
      body: { queryString: 'FROM logs | WHERE x > 1', profileContext: 'profile text' },
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

describe('registerOptimizeQueryRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('availability', () => {
    it('reports available when a connector can be resolved, without calling the model', async () => {
      const { router, availabilityHandler, requestHandlerContext, request, response } =
        buildMocks();
      resolveConnectorId.mockResolvedValue('connector-1');

      expect(router.get).toHaveBeenCalledWith(
        expect.objectContaining({ path: OPTIMIZE_QUERY_ROUTE }),
        expect.any(Function)
      );
      await availabilityHandler(requestHandlerContext, request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: { available: true } });
      expect(createScopedModel).not.toHaveBeenCalled();
    });

    it('reports unavailable without a connector, and when the lookup fails', async () => {
      const { availabilityHandler, requestHandlerContext, request, response } = buildMocks();

      resolveConnectorId.mockResolvedValueOnce(undefined);
      await availabilityHandler(requestHandlerContext, request, response);
      expect(response.ok).toHaveBeenLastCalledWith({ body: { available: false } });

      resolveConnectorId.mockRejectedValueOnce(new Error('license'));
      await availabilityHandler(requestHandlerContext, request, response);
      expect(response.ok).toHaveBeenLastCalledWith({ body: { available: false } });
    });
  });

  it('registers a POST handler at the optimize path with bounded input', () => {
    const { router } = buildMocks();
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: OPTIMIZE_QUERY_ROUTE }),
      expect.any(Function)
    );
  });

  it('returns 400 when no connector is configured', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue(undefined);

    await handler(requestHandlerContext, request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(createScopedModel).not.toHaveBeenCalled();
  });

  it('returns the rewritten query and the reason', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    const invoke = modelReturning({
      canImprove: true,
      query: ' FROM logs | WHERE x > 1 | KEEP x ',
      reason: 'Only x is used, so other fields need not be loaded.',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        query: 'FROM logs | WHERE x > 1 | KEEP x',
        reason: 'Only x is used, so other fields need not be loaded.',
      },
    });
    const [messages] = invoke.mock.calls[0];
    expect(JSON.stringify(messages)).toContain('FROM logs | WHERE x > 1');
    expect(JSON.stringify(messages)).toContain('profile text');
  });

  it('tells the model which command to focus on when the user asked for one', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    const invoke = modelReturning({ canImprove: false, query: '', reason: 'Nothing to do.' });
    request.body = { ...request.body, focusCommand: 'STATS c = COUNT(*) BY a' } as never;

    await handler(requestHandlerContext, request, response);

    const [messages] = invoke.mock.calls[0];
    expect(JSON.stringify(messages)).toContain('<focus>');
    expect(JSON.stringify(messages)).toContain('STATS c = COUNT(*) BY a');
  });

  it('does not mention a focus when none was asked for', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    const invoke = modelReturning({ canImprove: false, query: '', reason: 'Nothing to do.' });

    await handler(requestHandlerContext, request, response);

    expect(JSON.stringify(invoke.mock.calls[0][0])).not.toContain('<focus>');
  });

  it('asks the model for a deterministic answer, so the same query gets the same rewrite', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({ canImprove: false, query: '', reason: 'Already efficient.' });

    await handler(requestHandlerContext, request, response);

    expect(createScopedModel).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'connector-1', chatModelOptions: { temperature: 0 } })
    );
  });

  it('returns no query when the model finds no safe improvement', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({ canImprove: false, query: '', reason: 'Already efficient.' });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { query: null, reason: 'Already efficient.' },
    });
  });

  it('does not offer the original query back, even when it is reformatted', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({
      canImprove: true,
      query: 'FROM logs\n  | WHERE   x > 1',
      reason: 'Looks faster.',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { query: null, reason: 'Looks faster.' },
    });
  });

  it('returns 403 for a license failure and 500 for other failures', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockRejectedValueOnce(
      Object.assign(new Error('license_expired'), { reason: 'license_expired' })
    );
    await handler(requestHandlerContext, request, response);
    expect(response.forbidden).toHaveBeenCalled();

    createScopedModel.mockRejectedValueOnce(new Error('boom'));
    await handler(requestHandlerContext, request, response);
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
