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
  getTimeFieldFromESQLQuery: jest.fn().mockReturnValue(undefined),
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
      transport: { request: jest.fn().mockResolvedValue({ columns: [] }) },
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
});
