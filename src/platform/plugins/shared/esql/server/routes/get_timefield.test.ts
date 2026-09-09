/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { registerGetTimeFieldRoute } from './get_timefield';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';

jest.mock('@kbn/esql-utils', () => ({
  getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('logs-*'),
  getProjectRoutingFromEsqlQuery: jest.fn().mockReturnValue(undefined),
  parseTimeFieldFromESQLQuery: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@elastic/esql', () => ({
  Parser: { parse: jest.fn().mockReturnValue({ root: { commands: [] } }) },
  isSubQuery: jest.fn().mockReturnValue(false),
}));

jest.mock('@kbn/esql-server-utils', () => ({
  EsqlService: jest.fn().mockImplementation(() => ({
    getViews: jest.fn().mockResolvedValue({ views: [] }),
    getDatasets: jest.fn().mockResolvedValue({ datasets: [] }),
  })),
}));

const { parseTimeFieldFromESQLQuery } = jest.requireMock('@kbn/esql-utils');
const { getProjectRoutingFromEsqlQuery } = jest.requireMock('@kbn/esql-utils');
const { Parser } = jest.requireMock('@elastic/esql');

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const featureFlags = { getBooleanValue: jest.fn().mockResolvedValue(false) };
  const esClient = {
    asCurrentUser: {
      fieldCaps: jest.fn().mockResolvedValue({ fields: { '@timestamp': {} } }),
      esql: { query: jest.fn().mockResolvedValue({ columns: [] }) },
    },
  };
  const core = {
    elasticsearch: { client: esClient },
    featureFlags,
  };
  const requestHandlerContext = { core: Promise.resolve(core) };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
    customError: jest.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  return {
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    response,
    context: context as unknown as PluginInitializerContext,
  };
}

describe('registerGetTimeFieldRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a POST handler at the correct path', () => {
    const { router, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: TIMEFIELD_ROUTE }),
      expect.any(Function)
    );
  });

  it('forwards project routing to field caps', async () => {
    const { router, handler, requestHandlerContext, response, context } = buildMocks();
    Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
    registerGetTimeFieldRoute(router, context);

    await handler(
      requestHandlerContext,
      { body: { query: 'FROM logs-*', projectRouting: '_alias:*' } },
      response
    );

    const core = await requestHandlerContext.core;
    expect(core.elasticsearch.client.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
      index: 'logs-*',
      fields: '@timestamp',
      include_unmapped: false,
      project_routing: '_alias:*',
    });
  });

  it('prefers SET project_routing over the provided project routing', async () => {
    const { router, handler, requestHandlerContext, response, context } = buildMocks();
    Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
    getProjectRoutingFromEsqlQuery.mockReturnValueOnce('_alias:linked');
    registerGetTimeFieldRoute(router, context);

    await handler(
      requestHandlerContext,
      {
        body: {
          query: 'SET project_routing = "_alias:linked"; FROM logs-*',
          projectRouting: '_alias:_origin',
        },
      },
      response
    );

    const core = await requestHandlerContext.core;
    expect(core.elasticsearch.client.asCurrentUser.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:linked' })
    );
  });

  describe('nesting-depth guard', () => {
    it('returns 400 for a query whose parenthesis nesting depth exceeds the limit', async () => {
      const { router, handler, requestHandlerContext, response, context } = buildMocks();
      registerGetTimeFieldRoute(router, context);

      const depth = 51;
      const query = 'FROM a | WHERE ' + '('.repeat(depth) + '1' + ')'.repeat(depth);
      await handler(requestHandlerContext, { body: { query } }, response);

      expect(response.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining('nesting depth') })
      );
      expect(parseTimeFieldFromESQLQuery).not.toHaveBeenCalled();
      expect(Parser.parse).not.toHaveBeenCalled();
    });

    it('returns 400 for a deeply nested bracket query (square brackets)', async () => {
      const { router, handler, requestHandlerContext, response, context } = buildMocks();
      registerGetTimeFieldRoute(router, context);

      const depth = 60;
      const query = 'FROM a | WHERE x IN ' + '['.repeat(depth) + '1' + ']'.repeat(depth);
      await handler(requestHandlerContext, { body: { query } }, response);

      expect(response.badRequest).toHaveBeenCalled();
      expect(parseTimeFieldFromESQLQuery).not.toHaveBeenCalled();
    });

    it('allows a query exactly at the nesting limit (depth 50)', async () => {
      const { router, handler, requestHandlerContext, response, context } = buildMocks();
      registerGetTimeFieldRoute(router, context);

      const depth = 50;
      const query = 'FROM a | WHERE ' + '('.repeat(depth) + '1' + ')'.repeat(depth);
      await handler(requestHandlerContext, { body: { query } }, response);

      expect(response.badRequest).not.toHaveBeenCalled();
    });

    it('allows a normal flat query', async () => {
      const { router, handler, requestHandlerContext, response, context } = buildMocks();
      registerGetTimeFieldRoute(router, context);

      const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
      await handler(requestHandlerContext, { body: { query } }, response);

      expect(response.badRequest).not.toHaveBeenCalled();
    });

    it('blocks the permanent-hang PoC payload (depth 1500)', async () => {
      const { router, handler, requestHandlerContext, response, context } = buildMocks();
      registerGetTimeFieldRoute(router, context);

      const depth = 1500;
      const query = 'FROM a | WHERE ' + '('.repeat(depth) + '1' + ')'.repeat(depth);
      await handler(requestHandlerContext, { body: { query } }, response);

      expect(response.badRequest).toHaveBeenCalled();
      expect(parseTimeFieldFromESQLQuery).not.toHaveBeenCalled();
      expect(Parser.parse).not.toHaveBeenCalled();
    });
  });
});
