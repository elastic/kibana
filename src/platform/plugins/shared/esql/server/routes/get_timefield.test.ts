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

const {
  parseTimeFieldFromESQLQuery,
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
} = jest.requireMock('@kbn/esql-utils');
const { Parser, isSubQuery } = jest.requireMock('@elastic/esql');

const describeResponse = (role: string | null) => ({
  columns: [{ name: 'name' }, { name: 'type' }, { name: 'role' }],
  values: [['@timestamp', 'date', role]],
});

const unknownColumn = () =>
  Object.assign(
    new Error('verification_exception: Found 1 problem\nline 1:20: Unknown column [@timestamp]'),
    { statusCode: 400 }
  );

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };

  const esClient = {
    asCurrentUser: {
      esql: { query: jest.fn().mockResolvedValue(describeResponse('time')) },
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
    client: esClient.asCurrentUser,
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
    // a value queued for a call that never happens must not reach the next test
    Parser.parse.mockReset().mockReturnValue({ root: { commands: [] } });
    isSubQuery.mockReset().mockReturnValue(false);
    getIndexPatternFromESQLQuery.mockReset().mockReturnValue('logs-*');
    getProjectRoutingFromEsqlQuery.mockReset().mockReturnValue(undefined);
    parseTimeFieldFromESQLQuery.mockReset().mockReturnValue(undefined);
  });

  it('registers a POST handler at the correct path', () => {
    const { router, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: TIMEFIELD_ROUTE }),
      expect.any(Function)
    );
  });

  describe('resolving the time field of the sources', () => {
    const setup = () => {
      const mocks = buildMocks();
      registerGetTimeFieldRoute(mocks.router, mocks.context);
      return mocks;
    };

    const run = (
      { handler, requestHandlerContext, response }: ReturnType<typeof setup>,
      {
        sources = 'logs-*',
        subquery = false,
        projectRouting,
      }: { sources?: string; subquery?: boolean; projectRouting?: string } = {}
    ) => {
      Parser.parse.mockReturnValueOnce({
        root: { commands: [{ name: 'from', args: subquery ? [{}, {}] : [] }] },
      });
      if (subquery) isSubQuery.mockReturnValueOnce(true);
      getIndexPatternFromESQLQuery.mockReturnValueOnce(sources);
      return handler(
        requestHandlerContext,
        { body: { query: `FROM ${sources}`, ...(projectRouting ? { projectRouting } : {}) } },
        response
      );
    };

    const describeQueries = (client: { esql: { query: jest.Mock } }) =>
      client.esql.query.mock.calls.map(([{ query }]) => query);

    it('returns @timestamp when the source has a time column', async () => {
      const mocks = setup();

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
      expect(mocks.client.esql.query).toHaveBeenCalledTimes(1);
      expect(mocks.client.esql.query).toHaveBeenCalledWith({
        query: 'FROM logs-* | KEEP @timestamp | DESCRIBE',
      });
    });

    it('forwards the project routing', async () => {
      const mocks = setup();

      await run(mocks, { projectRouting: '_alias:*' });

      expect(mocks.client.esql.query).toHaveBeenCalledWith({
        query: 'FROM logs-* | KEEP @timestamp | DESCRIBE',
        project_routing: '_alias:*',
      });
    });

    it('prefers SET project_routing over the provided project routing', async () => {
      const mocks = setup();
      getProjectRoutingFromEsqlQuery.mockReturnValueOnce('_alias:linked');

      await run(mocks, { projectRouting: '_alias:_origin' });

      expect(mocks.client.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ project_routing: '_alias:linked' })
      );
    });

    it('returns the time field named in the query without asking ES|QL', async () => {
      const mocks = setup();
      parseTimeFieldFromESQLQuery.mockReturnValueOnce('sale_date');

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: 'sale_date' } });
      expect(mocks.client.esql.query).not.toHaveBeenCalled();
    });

    it('returns no time field for a query without a source command', async () => {
      const mocks = setup();
      Parser.parse.mockReturnValueOnce({ root: { commands: [{ name: 'row', args: [] }] } });

      await mocks.handler(
        mocks.requestHandlerContext,
        { body: { query: 'ROW a = 1' } },
        mocks.response
      );

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
      expect(mocks.client.esql.query).not.toHaveBeenCalled();
    });

    it('returns no time field when @timestamp is not a time column', async () => {
      const mocks = setup();
      mocks.client.esql.query.mockResolvedValueOnce(describeResponse('attribute'));

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    });

    it('returns @timestamp when the indices of a pattern disagree on its role', async () => {
      const mocks = setup();
      mocks.client.esql.query.mockResolvedValueOnce(describeResponse('mixed'));

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
    });

    it('returns no time field when the source has no @timestamp column', async () => {
      const mocks = setup();
      mocks.client.esql.query.mockRejectedValueOnce(unknownColumn());

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
      expect(mocks.logger.error).not.toHaveBeenCalled();
    });

    it('returns no time field when ES|QL answers without the column', async () => {
      const mocks = setup();
      mocks.client.esql.query.mockResolvedValueOnce({ columns: [{ name: 'other' }], values: [] });

      await run(mocks);

      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    });

    it('asks once for a list of sources, so ES|QL evaluates them together', async () => {
      const mocks = setup();

      await run(mocks, { sources: 'logs-a, logs-b' });

      expect(describeQueries(mocks.client)).toEqual([
        'FROM logs-a, logs-b | KEEP @timestamp | DESCRIBE',
      ]);
    });

    it('asks for every source of a query with subqueries and needs all of them to have it', async () => {
      const mocks = setup();
      mocks.client.esql.query
        .mockResolvedValueOnce(describeResponse('time'))
        .mockRejectedValueOnce(unknownColumn());

      await run(mocks, { sources: 'logs-a,logs-b', subquery: true });

      expect(describeQueries(mocks.client)).toEqual([
        'FROM logs-a | KEEP @timestamp | DESCRIBE',
        'FROM logs-b | KEEP @timestamp | DESCRIBE',
      ]);
      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
    });

    it('returns @timestamp when every source of a query with subqueries has it', async () => {
      const mocks = setup();

      await run(mocks, { sources: 'logs-a,logs-b', subquery: true });

      expect(mocks.client.esql.query).toHaveBeenCalledTimes(2);
      expect(mocks.response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
    });

    it('logs an unknown index at debug level and other failures as errors, with no time field', async () => {
      const unknown = setup();
      unknown.client.esql.query.mockRejectedValueOnce(
        Object.assign(new Error('Unknown index [logs-*]'), { statusCode: 400 })
      );
      await run(unknown);
      expect(unknown.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
      expect(unknown.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('DESCRIBE of "logs-*" failed'),
        expect.anything()
      );
      expect(unknown.logger.error).not.toHaveBeenCalled();

      const failing = setup();
      failing.client.esql.query.mockRejectedValueOnce(
        Object.assign(new Error("mismatched input 'DESCRIBE'"), { statusCode: 400 })
      );
      await run(failing);
      expect(failing.response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
      expect(failing.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('DESCRIBE of "logs-*" failed'),
        expect.anything()
      );
    });
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
