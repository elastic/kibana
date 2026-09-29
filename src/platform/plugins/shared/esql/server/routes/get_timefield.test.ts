/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { registerGetTimeFieldRoute } from './get_timefield';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';

vi.mock('@kbn/esql-utils', () => {
      const mocked = {
      getIndexPatternFromESQLQuery: vi.fn().mockReturnValue('logs-*'),
      getProjectRoutingFromEsqlQuery: vi.fn().mockReturnValue(undefined),
      parseTimeFieldFromESQLQuery: vi.fn().mockReturnValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@elastic/esql', () => {
      const mocked = {
      Parser: { parse: vi.fn().mockReturnValue({ root: { commands: [] } }) },
      isSubQuery: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/esql-server-utils', () => {
      const mocked = {
      EsqlService: vi.fn().mockImplementation(() => ({
        getViews: vi.fn().mockResolvedValue({ views: [] }),
        getDatasets: vi.fn().mockResolvedValue({ datasets: [] }),
      })),
    };
      return { ...mocked, default: mocked };
    });

const {
  parseTimeFieldFromESQLQuery,
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
} = (await vi.importMock('@kbn/esql-utils'));
const { Parser } = (await vi.importMock('@elastic/esql'));
const { EsqlService } = (await vi.importMock('@kbn/esql-server-utils'));

function buildMocks() {
  const handler = vi.fn();
  const router = {
    post: vi.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const esClient = {
    asCurrentUser: {
      fieldCaps: vi.fn().mockResolvedValue({ fields: { '@timestamp': {} } }),
      esql: { query: vi.fn().mockResolvedValue({ columns: [] }) },
    },
  };
  const core = {
    elasticsearch: { client: esClient },
  };
  const requestHandlerContext = { core: Promise.resolve(core) };
  const response = {
    ok: vi.fn((r) => ({ status: 200, ...r })),
    badRequest: vi.fn((r) => ({ status: 400, ...r })),
    customError: vi.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };
  const context = { logger: { get: () => ({ error: vi.fn() }) } };

  return {
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    response,
    context: context as unknown as PluginInitializerContext,
  };
}

describe('registerGetTimeFieldRoute', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('returns @timestamp for a dataset source without using fieldCaps', async () => {
    const { router, handler, requestHandlerContext, response, context } = buildMocks();
    getIndexPatternFromESQLQuery.mockReturnValueOnce('my-dataset');
    Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
    EsqlService.mockImplementationOnce(() => ({
      getViews: vi.fn().mockResolvedValue({ views: [] }),
      getDatasets: vi.fn().mockResolvedValue({ datasets: [{ name: 'my-dataset' }] }),
    }));

    const core = await requestHandlerContext.core;
    core.elasticsearch.client.asCurrentUser.esql.query.mockResolvedValueOnce({
      columns: [{ name: '@timestamp' }],
    });

    registerGetTimeFieldRoute(router, context);

    await handler(requestHandlerContext, { body: { query: 'FROM my-dataset' } }, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
    expect(core.elasticsearch.client.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
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
