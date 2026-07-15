/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { registerGetTimeFieldRoute } from './get_timefield';

jest.mock('@kbn/esql-server-utils', () => ({
  EsqlService: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  getTimeFieldFromESQLQuery: jest.fn(),
  getIndexPatternFromESQLQuery: jest.fn(),
}));

jest.mock('@elastic/esql', () => ({
  Parser: { parse: jest.fn() },
  isSubQuery: jest.fn(),
}));

jest.mock('../metrics', () => ({
  esqlRouteRequestCounter: { add: jest.fn() },
  getErrorStatusCode: jest.fn(() => 500),
}));

const { EsqlService } = jest.requireMock('@kbn/esql-server-utils');
const { getTimeFieldFromESQLQuery, getIndexPatternFromESQLQuery } =
  jest.requireMock('@kbn/esql-utils');
const { Parser, isSubQuery } = jest.requireMock('@elastic/esql');

const getViews = jest.fn();
const getDatasets = jest.fn();
const fieldCaps = jest.fn();
const transportRequest = jest.fn();

function buildMocks() {
  const handler = jest.fn();
  const router = {
    post: jest.fn((_, h) => {
      handler.mockImplementation(h);
    }),
  };
  const asCurrentUser = { fieldCaps, transport: { request: transportRequest } };
  const core = { elasticsearch: { client: { asCurrentUser } } };
  const requestHandlerContext = { core: Promise.resolve(core) };
  const request = { body: { query: 'FROM my_source' } };
  const response = { ok: jest.fn((r) => ({ status: 200, ...r })) };
  const context = { logger: { get: () => ({ error: jest.fn() }) } };

  return {
    router: router as unknown as IRouter,
    handler,
    requestHandlerContext,
    request,
    response,
    context: context as unknown as PluginInitializerContext,
  };
}

describe('registerGetTimeFieldRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EsqlService.mockImplementation(() => ({ getViews, getDatasets }));
    getViews.mockResolvedValue({ views: [] });
    getDatasets.mockResolvedValue({ datasets: [] });
    getTimeFieldFromESQLQuery.mockReturnValue(undefined);
    getIndexPatternFromESQLQuery.mockReturnValue('my_source');
    Parser.parse.mockReturnValue({ root: { commands: [{ name: 'from', args: [] }] } });
    isSubQuery.mockReturnValue(false);
    fieldCaps.mockResolvedValue({ fields: {} });
    transportRequest.mockResolvedValue({ columns: [] });
  });

  it('registers a POST handler at the timefield path', () => {
    const { router, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: TIMEFIELD_ROUTE }),
      expect.any(Function)
    );
  });

  it('resolves @timestamp for a dataset via the FROM | LIMIT 0 probe when fieldCaps cannot describe it', async () => {
    const { router, handler, requestHandlerContext, request, response, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);

    // The source is a dataset (not an index): fieldCaps has no @timestamp, but the dataset exposes one
    // (e.g. via a `path` rename), which the probe surfaces.
    getDatasets.mockResolvedValue({ datasets: [{ name: 'my_source' }] });
    transportRequest.mockResolvedValue({ columns: [{ name: '@timestamp', type: 'date' }] });

    await handler(requestHandlerContext, request, response);

    expect(transportRequest).toHaveBeenCalled(); // the probe ran for the dataset
    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
  });

  it('returns undefined when a dataset does not expose an @timestamp column', async () => {
    const { router, handler, requestHandlerContext, request, response, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);

    getDatasets.mockResolvedValue({ datasets: [{ name: 'my_source' }] });
    transportRequest.mockResolvedValue({ columns: [{ name: 'event_time', type: 'date' }] });

    await handler(requestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: undefined } });
  });

  it('still resolves @timestamp for an index via fieldCaps (no probe needed)', async () => {
    const { router, handler, requestHandlerContext, request, response, context } = buildMocks();
    registerGetTimeFieldRoute(router, context);

    fieldCaps.mockResolvedValue({ fields: { '@timestamp': {} } });

    await handler(requestHandlerContext, request, response);

    expect(transportRequest).not.toHaveBeenCalled(); // fieldCaps resolved it; no dataset/view probe
    expect(response.ok).toHaveBeenCalledWith({ body: { timeField: '@timestamp' } });
  });
});
