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

const {
  parseTimeFieldFromESQLQuery,
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
} = jest.requireMock('@kbn/esql-utils');
const { Parser } = jest.requireMock('@elastic/esql');
const { EsqlService } = jest.requireMock('@kbn/esql-server-utils');

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const esClient = {
    asCurrentUser: {
      fieldCaps: jest.fn().mockResolvedValue({ fields: { '@timestamp': {} } }),
      esql: { query: jest.fn().mockResolvedValue({ columns: [] }) },
    },
  };
  const core = {
    elasticsearch: { client: esClient },
  };
  const requestHandlerContext = { core: Promise.resolve(core) };
  const response = {
    ok: jest.fn((r) => ({ status: 200, ...r })),
    badRequest: jest.fn((r) => ({ status: 400, ...r })),
    customError: jest.fn((r) => ({ status: r?.statusCode ?? 500, ...r })),
  };
  const logger = { error: jest.fn(), debug: jest.fn() };
  const context = { logger: { get: () => logger } };

  return {
    logger,
    esClient,
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    response,
    context: context as unknown as PluginInitializerContext,
  };
}

describe('registerGetTimeFieldRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // a test that never reaches the service must not leave a mocked implementation for the next one
    EsqlService.mockReset().mockImplementation(() => ({
      getViews: jest.fn().mockResolvedValue({ views: [] }),
      getDatasets: jest.fn().mockResolvedValue({ datasets: [] }),
    }));
  });

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

  it('returns @timestamp for a dataset source that fieldCaps does not know', async () => {
    const { router, handler, requestHandlerContext, response, context } = buildMocks();
    getIndexPatternFromESQLQuery.mockReturnValueOnce('my-dataset');
    Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
    EsqlService.mockImplementationOnce(() => ({
      getViews: jest.fn().mockResolvedValue({ views: [] }),
      getDatasets: jest.fn().mockResolvedValue({ datasets: [{ name: 'my-dataset' }] }),
    }));

    const core = await requestHandlerContext.core;
    core.elasticsearch.client.asCurrentUser.fieldCaps.mockRejectedValueOnce(
      Object.assign(new Error('no such index [my-dataset]'), { statusCode: 404 })
    );
    core.elasticsearch.client.asCurrentUser.esql.query.mockResolvedValueOnce({
      columns: [{ name: '@timestamp' }],
    });

    registerGetTimeFieldRoute(router, context);

    await handler(requestHandlerContext, { body: { query: 'FROM my-dataset' } }, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
    expect(core.elasticsearch.client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM my-dataset | LIMIT 0' })
    );
  });

  describe('resolving the time field of the sources', () => {
    const setup = async ({
      views = [],
      datasets = [],
    }: {
      views?: Array<{ name: string }>;
      datasets?: Array<{ name: string }>;
    } = {}) => {
      const mocks = buildMocks();
      const getViews = jest.fn().mockResolvedValue({ views });
      const getDatasets = jest.fn().mockResolvedValue({ datasets });
      EsqlService.mockImplementationOnce(() => ({ getViews, getDatasets }));
      Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
      registerGetTimeFieldRoute(mocks.router, mocks.context);
      const core = await mocks.requestHandlerContext.core;
      return { ...mocks, getViews, getDatasets, client: core.elasticsearch.client.asCurrentUser };
    };

    const run = ({ handler, requestHandlerContext, response }: Awaited<ReturnType<typeof setup>>) =>
      handler(requestHandlerContext, { body: { query: 'FROM logs-*' } }, response);

    it('does not list the views and the datasets when fieldCaps finds @timestamp', async () => {
      const mocks = await setup();

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
      expect(mocks.client.fieldCaps).toHaveBeenCalledTimes(1);
      expect(mocks.getViews).not.toHaveBeenCalled();
      expect(mocks.getDatasets).not.toHaveBeenCalled();
      expect(mocks.client.esql.query).not.toHaveBeenCalled();
    });

    it('returns no time field when neither fieldCaps, views nor datasets have @timestamp', async () => {
      const mocks = await setup();
      mocks.client.fieldCaps.mockResolvedValueOnce({ fields: {} });

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
      expect(mocks.getViews).toHaveBeenCalled();
      expect(mocks.getDatasets).toHaveBeenCalled();
    });

    it('resolves a view source when fieldCaps does not find @timestamp', async () => {
      const mocks = await setup({ views: [{ name: 'logs-*' }] });
      getIndexPatternFromESQLQuery.mockReturnValueOnce('logs-*');
      mocks.client.fieldCaps.mockResolvedValueOnce({ fields: {} });
      mocks.client.esql.query.mockResolvedValueOnce({ columns: [{ name: '@timestamp' }] });

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
      expect(mocks.client.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'FROM logs-* | LIMIT 0' })
      );
    });

    it('does not return @timestamp when a view source has no @timestamp column', async () => {
      const mocks = await setup({ views: [{ name: 'logs-*' }] });
      getIndexPatternFromESQLQuery.mockReturnValueOnce('logs-*');
      mocks.client.fieldCaps.mockResolvedValueOnce({ fields: {} });
      mocks.client.esql.query.mockResolvedValueOnce({ columns: [{ name: 'message' }] });

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    });

    it('logs an unknown index from fieldCaps at debug level and other failures as errors', async () => {
      const mocks = await setup();
      mocks.client.fieldCaps.mockRejectedValueOnce(
        Object.assign(new Error('no such index'), { statusCode: 404 })
      );

      await run(mocks);

      expect(mocks.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('fieldCaps check failed'),
        expect.anything()
      );
      expect(mocks.logger.error).not.toHaveBeenCalled();

      const failing = await setup();
      failing.client.fieldCaps.mockRejectedValueOnce(new Error('boom'));

      await run(failing);

      expect(failing.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('fieldCaps check failed'),
        expect.anything()
      );
    });
  });

  it('requests the views and the datasets in parallel', async () => {
    const { router, handler, requestHandlerContext, response, context } = buildMocks();
    let resolveViews: (value: { views: unknown[] }) => void = () => {};
    const getViews = jest.fn(
      () =>
        new Promise<{ views: unknown[] }>((resolve) => {
          resolveViews = resolve;
        })
    );
    const getDatasets = jest.fn().mockResolvedValue({ datasets: [] });
    EsqlService.mockImplementationOnce(() => ({ getViews, getDatasets }));
    Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'from', args: [] }] } });
    registerGetTimeFieldRoute(router, context);
    const core = await requestHandlerContext.core;
    core.elasticsearch.client.asCurrentUser.fieldCaps.mockResolvedValueOnce({ fields: {} });

    const pending = handler(requestHandlerContext, { body: { query: 'FROM logs-*' } }, response);
    await new Promise((resolve) => setImmediate(resolve));

    expect(getDatasets).toHaveBeenCalled();

    resolveViews({ views: [] });
    await pending;

    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
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
