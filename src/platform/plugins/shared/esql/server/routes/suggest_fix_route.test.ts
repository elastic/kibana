/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { registerSuggestFixRoute } from './suggest_fix_route';
import { SUGGEST_FIX_ROUTE } from '@kbn/esql-types';
import type { EsqlServerPluginStart } from '../types';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

jest.mock('./helpers', () => ({
  resolveConnectorId: jest.fn(),
  createScopedModel: jest.fn(),
}));

const { generateEsql } = jest.requireMock('@kbn/agent-builder-genai-utils');
const { resolveConnectorId, createScopedModel } = jest.requireMock('./helpers');

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const uiSettingsClient = { get: jest.fn() };
  const inference = {};
  const esClient = { asCurrentUser: {} };
  const core = {
    elasticsearch: { client: esClient },
    uiSettings: { client: uiSettingsClient },
  };
  const requestHandlerContext = {
    core: Promise.resolve(core),
  };
  const request = { body: {}, headers: {} };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
    forbidden: jest.fn((r) => ({ status: 403, ...r })),
    customError: jest.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };

  const getStartServices = jest.fn().mockResolvedValue([{}, { inference }]);
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  return {
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    request,
    response,
    getStartServices:
      getStartServices as unknown as CoreSetup<EsqlServerPluginStart>['getStartServices'],
    context: context as unknown as PluginInitializerContext,
  };
}

describe('registerSuggestFixRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a POST handler at the correct path', () => {
    const { router, getStartServices, context } = buildMocks();
    registerSuggestFixRoute(router, getStartServices, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: SUGGEST_FIX_ROUTE }),
      expect.any(Function)
    );
  });

  it('accepts null for errorCode (JSON serialises undefined as null)', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerSuggestFixRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    generateEsql.mockResolvedValue({ query: 'FROM correct_index' });

    request.body = {
      queryString: 'FROM wrong_index',
      errorMessage: 'Unknown index',
      errorCode: null,
    };
    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { content: 'FROM correct_index' } });
  });

  it('returns 400 when no connector is configured', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerSuggestFixRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue(null);

    request.body = { queryString: 'FROM index', errorMessage: 'syntax error' };
    await handler(requestHandlerContext, request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(generateEsql).not.toHaveBeenCalled();
  });

  it('returns 403 when the license check fails', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerSuggestFixRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});

    const licenseError = Object.assign(new Error('license_expired'), { reason: 'license_expired' });
    generateEsql.mockRejectedValue(licenseError);

    request.body = { queryString: 'FROM index', errorMessage: 'syntax error' };
    await handler(requestHandlerContext, request, response);

    expect(response.forbidden).toHaveBeenCalled();
  });

  it('returns 200 with the corrected query on success', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerSuggestFixRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    generateEsql.mockResolvedValue({
      query: 'FROM kibana_sample_data_flights | SORT avg DESC',
    });

    request.body = {
      queryString: 'FROM kibana_sample_data_flights | SORT avg DESCENGING',
      errorMessage: "Unknown function 'DESCENGING'",
    };
    await handler(requestHandlerContext, request, response);

    expect(generateEsql).toHaveBeenCalledWith(expect.objectContaining({ executeQuery: false }));
    expect(response.ok).toHaveBeenCalledWith({
      body: { content: 'FROM kibana_sample_data_flights | SORT avg DESC' },
    });
  });
});
