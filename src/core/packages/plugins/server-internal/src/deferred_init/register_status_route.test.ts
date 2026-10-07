/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DEFERRED_INIT_STATUS_ROUTE } from '@kbn/core-deferred-init-common';
import type { PluginInitStatus } from '@kbn/core-deferred-init-common';
import { registerDeferredInitStatusRoute } from './register_status_route';
import { DeferredInitEngine } from './deferred_init_engine';
import { DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS } from './backoff';

const PLUGIN_ID = 'myPlugin';

type EngineMock = jest.Mocked<Pick<DeferredInitEngine, 'getStatus' | 'ensureInitialized'>>;

const createEngineMock = (status: PluginInitStatus): EngineMock => ({
  getStatus: jest.fn().mockReturnValue(status),
  ensureInitialized: jest.fn().mockReturnValue(status.state),
});

const createHandler = (engine: EngineMock | DeferredInitEngine) => {
  const router = mockRouter.create();
  registerDeferredInitStatusRoute(router, engine as DeferredInitEngine);
  const [config, handler] = (router.get as jest.Mock).mock.calls[0];
  return { config, handler };
};

const poll = async (handler: ReturnType<typeof createHandler>['handler']) => {
  const response = mockRouter.createResponseFactory();
  await handler({}, mockRouter.createKibanaRequest({ params: { pluginId: PLUGIN_ID } }), response);
  return response;
};

describe('registerDeferredInitStatusRoute', () => {
  it('registers the shared status route path, unauthenticated and internal-only', () => {
    const { config } = createHandler(createEngineMock({ state: 'idle', attempts: 0 }));

    expect(config.path).toBe(DEFERRED_INIT_STATUS_ROUTE);
    expect(config.path).not.toBe('/status');
    expect(config.security.authz.enabled).toBe(false);
    expect(config.options.access).toBe('internal');
  });

  it('returns only pluginId and status while no attempt has failed', async () => {
    const engine = createEngineMock({ state: 'initializing', attempts: 0 });
    const { handler } = createHandler(engine);

    const response = await poll(handler);

    expect(engine.ensureInitialized).toHaveBeenCalledWith(PLUGIN_ID);
    expect(response.ok).toHaveBeenCalledWith({
      body: { pluginId: PLUGIN_ID, status: 'initializing' },
    });
  });

  it('includes the attempt count and the last error message when failed', async () => {
    const engine = createEngineMock({
      state: 'failed',
      attempts: 3,
      lastError: new Error('boom'),
    });
    const { handler } = createHandler(engine);

    const response = await poll(handler);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        pluginId: PLUGIN_ID,
        status: 'failed',
        attempts: 3,
        error: { message: 'boom' },
      },
    });
  });

  it('keeps reporting the failed attempts and last error during the retry that follows a failure', async () => {
    const engine = createEngineMock({
      state: 'initializing',
      attempts: 1,
      lastError: new Error('boom'),
    });
    const { handler } = createHandler(engine);

    const response = await poll(handler);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        pluginId: PLUGIN_ID,
        status: 'initializing',
        attempts: 1,
        error: { message: 'boom' },
      },
    });
  });

  it('reads the status before kicking an attempt', async () => {
    const engine = createEngineMock({ state: 'idle', attempts: 0 });
    const { handler } = createHandler(engine);

    await poll(handler);

    expect(engine.getStatus).toHaveBeenCalledWith(PLUGIN_ID);
    expect(engine.ensureInitialized).toHaveBeenCalledWith(PLUGIN_ID);
    expect(engine.getStatus.mock.invocationCallOrder[0]).toBeLessThan(
      engine.ensureInitialized.mock.invocationCallOrder[0]
    );
  });

  describe('with a real engine', () => {
    let engine: DeferredInitEngine;

    beforeEach(() => {
      jest.useFakeTimers();
      engine = new DeferredInitEngine(loggingSystemMock.createLogger());
    });

    afterEach(async () => {
      // Let any attempt the handler kicked settle before the fake timers go away.
      await jest.advanceTimersByTimeAsync(0);
      jest.useRealTimers();
    });

    it('reports a failed plugin whose background retries are exhausted as failed on the very poll that re-kicks it', async () => {
      const runner = jest.fn<Promise<void>, []>().mockRejectedValue(new Error('boom'));
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, runner);
      // `initialize()` never waits out a cooldown, so this exhausts the background retries fast.
      for (let i = 0; i < DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS; i++) {
        await engine.initialize(PLUGIN_ID).catch(() => {});
      }
      expect(engine.getStatus(PLUGIN_ID)).toMatchObject({
        state: 'failed',
        attempts: DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
      });
      const { handler } = createHandler(engine);

      const response = await poll(handler);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          pluginId: PLUGIN_ID,
          status: 'failed',
          attempts: DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS,
          error: { message: 'boom' },
        },
      });
      // The same poll started the next attempt, after reading.
      expect(runner).toHaveBeenCalledTimes(DEFERRED_INIT_MAX_BACKGROUND_ATTEMPTS + 1);
      expect(engine.getStatus(PLUGIN_ID).state).toBe('initializing');
    });

    it('kicks an idle plugin and reports it idle on that first poll', async () => {
      engine.register(PLUGIN_ID);
      engine.setRunner(PLUGIN_ID, jest.fn<Promise<void>, []>().mockResolvedValue(undefined));
      const { handler } = createHandler(engine);

      const response = await poll(handler);

      expect(response.ok).toHaveBeenCalledWith({
        body: { pluginId: PLUGIN_ID, status: 'idle' },
      });
      expect(engine.getStatus(PLUGIN_ID).state).toBe('initializing');
      await jest.advanceTimersByTimeAsync(0);
      expect(engine.getStatus(PLUGIN_ID).state).toBe('available');
    });
  });
});
