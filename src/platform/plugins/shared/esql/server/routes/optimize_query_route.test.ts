/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { NO_AI_CONNECTOR_ERROR_CODE, OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import { registerOptimizeQueryRoute } from './optimize_query_route';
import type { EsqlServerPluginStart } from '../types';

jest.mock('./helpers', () => ({
  resolveConnectorId: jest.fn(),
}));

const { resolveConnectorId } = jest.requireMock('./helpers');
const getChatModel = jest.fn();

function buildMocks() {
  const handler = jest.fn();
  const router = {
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
  const getStartServices = jest.fn().mockResolvedValue([{}, { inference: { getChatModel } }]);
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  registerOptimizeQueryRoute(
    router as unknown as IRouter,
    getStartServices as unknown as CoreSetup<EsqlServerPluginStart>['getStartServices'],
    context as unknown as PluginInitializerContext
  );

  return {
    router,
    handler,
    response,
    requestHandlerContext: { core: Promise.resolve({}) },
    request: {
      body: { queryString: 'FROM logs | WHERE x > 1', profileContext: 'profile text' },
      headers: {},
      events: { aborted$: new Subject<void>() },
    },
  };
}

const modelReturning = (result: unknown) => {
  const invoke = jest.fn().mockResolvedValue(result);
  getChatModel.mockResolvedValue({ withStructuredOutput: jest.fn(() => ({ invoke })) });
  return invoke;
};

describe('registerOptimizeQueryRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a query or a profile that is too long', () => {
    const { router } = buildMocks();
    const [{ path, validate }] = router.post.mock.calls[0];
    const { body } = validate as { body: { validate: (value: unknown) => unknown } };

    expect(path).toBe(OPTIMIZE_QUERY_ROUTE);
    expect(() => body.validate({ queryString: 'x'.repeat(50_001), profileContext: 'p' })).toThrow();
    expect(() => body.validate({ queryString: 'q', profileContext: 'p'.repeat(60_001) })).toThrow();
    expect(() => body.validate({ queryString: 'q', profileContext: 'p' })).not.toThrow();
  });

  it('returns 400 with a code the UI can recognize when no connector is configured', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue(undefined);

    await handler(requestHandlerContext, request, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: NO_AI_CONNECTOR_ERROR_CODE } }),
    });
    expect(getChatModel).not.toHaveBeenCalled();
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

  it('returns no query when the model finds no safe improvement', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({ canImprove: false, query: '', reason: 'Already efficient.' });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { query: null, reason: 'Already efficient.' },
    });
  });

  it('does not offer the original query back, even when it is reformatted, nor the reason for a change that is not there', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    modelReturning({
      canImprove: true,
      query: 'FROM logs\n  | WHERE   x > 1',
      reason: 'Looks faster.',
    });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { query: null, reason: 'The suggestion did not change the query.' },
    });
  });

  it('returns 403 for a license failure and 500 for other failures', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    getChatModel.mockRejectedValueOnce(
      Object.assign(new Error('license_expired'), { reason: 'license_expired' })
    );
    await handler(requestHandlerContext, request, response);
    expect(response.forbidden).toHaveBeenCalled();

    getChatModel.mockRejectedValueOnce(new Error('boom'));
    await handler(requestHandlerContext, request, response);
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('stops the model when the request is aborted', async () => {
    const { handler, requestHandlerContext, request, response } = buildMocks();
    resolveConnectorId.mockResolvedValue('connector-1');
    const invoke = modelReturning({ canImprove: false, query: '', reason: 'Already efficient.' });

    await handler(requestHandlerContext, request, response);
    const { signal } = invoke.mock.calls[0][1] as { signal: AbortSignal };
    expect(signal.aborted).toBe(false);

    request.events.aborted$.next();
    request.events.aborted$.complete();
    expect(signal.aborted).toBe(true);
  });
});
