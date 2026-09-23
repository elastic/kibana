/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import { registerGetSourceInfoRoute } from './get_source_info';

jest.mock('@kbn/esql-utils', () => ({
  getNamedParams: jest.fn().mockReturnValue([]),
  fixESQLQueryWithVariables: jest.fn((query: string) => query),
}));

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: jest.fn(),
  getTimeZoneFromSettings: jest.fn().mockReturnValue('UTC'),
}));

jest.mock('@kbn/data-plugin/common', () => ({
  getTime: jest.fn(),
  getEsQueryConfig: jest.fn().mockReturnValue({}),
}));

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const errorLogger = { error: jest.fn() };
  const esqlQuery = jest.fn().mockResolvedValue({
    columns: [{ name: 'message', type: 'keyword' }],
    all_columns: undefined,
  });
  const core = {
    elasticsearch: {
      client: {
        asCurrentUser: {
          esql: { query: esqlQuery },
        },
      },
    },
    uiSettings: {
      client: {
        get: jest.fn().mockResolvedValue('UTC'),
      },
    },
  };
  const requestHandlerContext = { core: Promise.resolve(core) };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
  };
  const context = { logger: { get: () => errorLogger } };

  return {
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    response,
    context: context as unknown as PluginInitializerContext,
    esqlQuery,
    errorLogger,
  };
}

describe('registerGetSourceInfoRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a POST handler at the correct path', () => {
    const { router, context } = buildMocks();
    registerGetSourceInfoRoute(router, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: SOURCE_INFO_ROUTE }),
      expect.any(Function)
    );
  });

  it('appends | LIMIT 0 and forwards project routing', async () => {
    const { router, handler, requestHandlerContext, response, context, esqlQuery } = buildMocks();
    registerGetSourceInfoRoute(router, context);

    await handler(
      requestHandlerContext,
      {
        body: {
          query: 'FROM logs-*',
          projectRouting: '_alias:*',
        },
      },
      response
    );

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-*\n| LIMIT 0',
        project_routing: '_alias:*',
        time_zone: 'UTC',
        drop_null_columns: true,
        settings: { column_metadata: true },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { columns: [{ name: 'message', esType: 'keyword' }] },
    });
  });

  it('appends LIMIT 0 on a new line so a trailing // comment cannot swallow it', async () => {
    const { router, handler, requestHandlerContext, response, context, esqlQuery } = buildMocks();
    registerGetSourceInfoRoute(router, context);

    await handler(
      requestHandlerContext,
      { body: { query: 'FROM logs-* // latest events' } },
      response
    );

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-* // latest events\n| LIMIT 0',
      })
    );
  });

  it('returns 400 for a query whose parenthesis nesting depth exceeds the limit', async () => {
    const { router, handler, requestHandlerContext, response, context, esqlQuery } = buildMocks();
    registerGetSourceInfoRoute(router, context);

    const depth = 51;
    const query = 'FROM a | WHERE ' + '('.repeat(depth) + '1' + ')'.repeat(depth);
    await handler(requestHandlerContext, { body: { query } }, response);

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('nesting depth') })
    );
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('logs LIMIT 0 failures and does not return empty columns', async () => {
    const { router, handler, requestHandlerContext, response, context, esqlQuery, errorLogger } =
      buildMocks();
    esqlQuery.mockRejectedValueOnce(new Error('esql failed'));
    registerGetSourceInfoRoute(router, context);

    await expect(
      handler(requestHandlerContext, { body: { query: 'FROM logs-*' } }, response)
    ).rejects.toThrow('esql failed');

    expect(errorLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch ES|QL source info columns'),
      expect.objectContaining({ tags: ['esql', 'source_info'] })
    );
    expect(response.ok).not.toHaveBeenCalled();
  });
});
