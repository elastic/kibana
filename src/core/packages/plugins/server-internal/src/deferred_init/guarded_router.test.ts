/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import type { IRouter, RequestHandler } from '@kbn/core-http-server';
import { createGuardedRouter } from './guarded_router';
import type { DeferredInitEngine } from './deferred_init_engine';

const PLUGIN_ID = 'myPlugin';

const createEngine = (
  status: 'idle' | 'initializing' | 'available' | 'failed'
): jest.Mocked<Pick<DeferredInitEngine, 'ensureInitialized'>> => ({
  ensureInitialized: jest.fn().mockReturnValue(status),
});

const invokeWrapped = async (wrapped: RequestHandler, engine: ReturnType<typeof createEngine>) => {
  const response = mockRouter.createResponseFactory();
  const result = await wrapped({} as never, mockRouter.createKibanaRequest(), response);
  return { response, result, engine };
};

describe('createGuardedRouter', () => {
  it('returns 503 with retry-after while deferred init is not available, without calling the handler', async () => {
    const inner = mockRouter.create();
    const engine = createEngine('initializing');
    const guarded = createGuardedRouter(
      inner as unknown as IRouter,
      engine as unknown as DeferredInitEngine,
      PLUGIN_ID
    );
    const handler = jest.fn().mockReturnValue('ok');

    guarded.get({ path: '/foo' } as never, handler);
    const [, wrapped] = (inner.get as jest.Mock).mock.calls[0] as [unknown, RequestHandler];

    const { response, result } = await invokeWrapped(wrapped, engine);

    expect(engine.ensureInitialized).toHaveBeenCalledWith(PLUGIN_ID);
    expect(handler).not.toHaveBeenCalled();
    expect(response.custom).toHaveBeenCalledWith({
      statusCode: 503,
      headers: { 'retry-after': '1' },
      bypassErrorFormat: true,
      body: { pluginId: PLUGIN_ID, status: 'initializing' },
    });
    expect(result).toBe(response.custom.mock.results[0].value);
  });

  it('delegates to the original handler once the plugin is available', async () => {
    const inner = mockRouter.create();
    const engine = createEngine('available');
    const guarded = createGuardedRouter(
      inner as unknown as IRouter,
      engine as unknown as DeferredInitEngine,
      PLUGIN_ID
    );
    const handler = jest.fn().mockReturnValue('ok');

    guarded.post({ path: '/foo' } as never, handler);
    const [, wrapped] = (inner.post as jest.Mock).mock.calls[0] as [unknown, RequestHandler];

    const { response, result } = await invokeWrapped(wrapped, engine);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toBe('ok');
    expect(response.custom).not.toHaveBeenCalled();
  });

  it('gates versioned addVersion handlers the same way', async () => {
    const inner = mockRouter.create();
    const engine = createEngine('idle');
    const guarded = createGuardedRouter(
      inner as unknown as IRouter,
      engine as unknown as DeferredInitEngine,
      PLUGIN_ID
    );
    const handler = jest.fn().mockReturnValue('ok');

    guarded.versioned.get({ path: '/v' } as never).addVersion({ version: '1' } as never, handler);
    const versionedRoute = (inner.versioned.get as jest.Mock).mock.results[0].value;
    const [, wrapped] = versionedRoute.addVersion.mock.calls[0] as [unknown, RequestHandler];

    const { response } = await invokeWrapped(wrapped, engine);

    expect(engine.ensureInitialized).toHaveBeenCalledWith(PLUGIN_ID);
    expect(handler).not.toHaveBeenCalled();
    expect(response.custom).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        body: { pluginId: PLUGIN_ID, status: 'idle' },
      })
    );
  });

  it('passes non-registration methods through to the underlying router', () => {
    const inner = mockRouter.create();
    inner.getRoutes.mockReturnValue([{ path: '/existing' }] as never);
    const engine = createEngine('idle');
    const guarded = createGuardedRouter(
      inner as unknown as IRouter,
      engine as unknown as DeferredInitEngine,
      PLUGIN_ID
    );

    expect(guarded.getRoutes()).toEqual([{ path: '/existing' }]);
    expect(engine.ensureInitialized).not.toHaveBeenCalled();
  });
});
