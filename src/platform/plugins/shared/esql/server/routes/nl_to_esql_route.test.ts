/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { registerNLtoESQLRoute } from './nl_to_esql_route';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { EsqlServerPluginStart } from '../types';

vi.mock('@kbn/agent-builder-genai-utils', () => {
  const mocked = {
    generateEsql: vi.fn(),
    generateEsqlCompletion: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/data-plugin/server', () => {
  const mocked = {
    getRequestAbortedSignal: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./helpers', () => {
  const mocked = {
    resolveConnectorId: vi.fn(),
    createScopedModel: vi.fn(),
    resolveIncludeDatasets: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { generateEsql, generateEsqlCompletion } = await vi.importMock(
  '@kbn/agent-builder-genai-utils'
);
const { resolveConnectorId, createScopedModel, resolveIncludeDatasets } = await vi.importMock(
  './helpers'
);

function buildMocks() {
  const handler = vi.fn();
  const router = {
    post: vi.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const uiSettingsClient = { get: vi.fn() };
  const inference = {};
  const esClient = { asCurrentUser: {} };
  const core = {
    elasticsearch: { client: esClient },
    uiSettings: { client: uiSettingsClient },
  };
  const requestHandlerContext = {
    core: Promise.resolve(core),
  };
  const request = { body: {}, headers: {}, events: { aborted$: {} } };
  const response = {
    ok: vi.fn((r) => ({ status: 200, ...r })),
    badRequest: vi.fn((r) => ({ status: 400, ...r })),
    forbidden: vi.fn((r) => ({ status: 403, ...r })),
    customError: vi.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };

  const getStartServices = vi.fn().mockResolvedValue([{}, { inference }]);
  const context = { logger: { get: () => ({ error: vi.fn() }) } };

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

describe('registerNLtoESQLRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers a POST handler at the correct path', () => {
    const { router, getStartServices, context } = buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: NL_TO_ESQL_ROUTE }),
      expect.any(Function)
    );
  });

  it('returns 400 when no connector is configured', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue(null);

    request.body = { nlInstruction: 'count flights per carrier' };
    await handler(requestHandlerContext, request, response);

    expect(response.badRequest).toHaveBeenCalled();
    expect(generateEsql).not.toHaveBeenCalled();
  });

  it('returns 403 when the license check fails', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    resolveIncludeDatasets.mockResolvedValue(false);

    const licenseError = Object.assign(new Error('license_expired'), { reason: 'license_expired' });
    generateEsql.mockRejectedValue(licenseError);

    request.body = { nlInstruction: 'count flights per carrier' };
    await handler(requestHandlerContext, request, response);

    expect(response.forbidden).toHaveBeenCalled();
  });

  it('returns 200 with the generated query on success', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    resolveIncludeDatasets.mockResolvedValue(false);
    generateEsql.mockResolvedValue({ query: 'FROM kibana_sample_data_flights' });

    request.body = { nlInstruction: 'show me all flights' };
    await handler(requestHandlerContext, request, response);

    expect(generateEsql).toHaveBeenCalledWith(
      expect.objectContaining({ execute: 'none', includeViews: true })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { content: 'FROM kibana_sample_data_flights' },
    });
  });

  it('passes includeDatasets through from resolveIncludeDatasets', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    resolveIncludeDatasets.mockResolvedValue(true);
    generateEsql.mockResolvedValue({ query: 'FROM speedtest_fixed' });

    request.body = { nlInstruction: 'show me all speedtests' };
    await handler(requestHandlerContext, request, response);

    expect(generateEsql).toHaveBeenCalledWith(
      expect.objectContaining({ includeDatasets: true, includeViews: true })
    );
  });

  it('does not call generateEsql for a completion request (uses generateEsqlCompletion instead)', async () => {
    const { router, handler, requestHandlerContext, request, response, getStartServices, context } =
      buildMocks();
    registerNLtoESQLRoute(router, getStartServices, context);

    resolveConnectorId.mockResolvedValue('connector-1');
    createScopedModel.mockResolvedValue({});
    generateEsqlCompletion.mockResolvedValue({ content: ' | LIMIT 10', replacesNext: false });

    request.body = {
      nlInstruction: 'limit to 10',
      currentQuery: 'FROM speedtest_fixed',
      isCompletion: true,
    };
    await handler(requestHandlerContext, request, response);

    expect(generateEsqlCompletion).toHaveBeenCalled();
    expect(generateEsql).not.toHaveBeenCalled();
    expect(resolveIncludeDatasets).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: { content: ' | LIMIT 10', replacesNext: false },
    });
  });
});
