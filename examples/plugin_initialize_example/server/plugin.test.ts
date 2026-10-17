/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import {
  coreMock,
  elasticsearchServiceMock,
  httpResourcesMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { PluginInitializeExampleConfig } from './config';
import { PluginInitializeExampleServerPlugin } from './plugin';
import { DOC_ID, DOC_ROUTE, HEALTH_PATH, INDEX_NAME, STATUS_ROUTE } from '../common';

type InitializerContextMock = ReturnType<typeof coreMock.createPluginInitializerContext>;
type RouterMock = ReturnType<typeof httpServiceMock.createRouter>;

const doc = {
  instanceUuid: 'instance-uuid',
  initializedAt: '2026-01-01T00:00:00.000Z',
  attempt: 1,
};

const started: PluginInitializeExampleServerPlugin[] = [];

const createPlugin = (overrides: Partial<PluginInitializeExampleConfig> = {}) => {
  const config: PluginInitializeExampleConfig = {
    initDelayMs: 0,
    failAttempts: 0,
    slowStartMs: 0,
    ...overrides,
  };
  const ctx = coreMock.createPluginInitializerContext(config);
  const plugin = new PluginInitializeExampleServerPlugin(ctx);
  started.push(plugin);
  return { ctx, plugin };
};

// The core start mock types the internal client loosely; the elasticsearch mock exposes it fully.
const createCoreStart = () => {
  const elasticsearch = elasticsearchServiceMock.createStart();
  return {
    core: { ...coreMock.createStart(), elasticsearch },
    client: elasticsearch.client.asInternalUser,
  };
};

const infoMessages = (ctx: InitializerContextMock) =>
  loggingSystemMock.collect(ctx.logger).info.map(([message]) => message);

const findGetHandler = (router: RouterMock, path: string) => {
  const call = router.get.mock.calls.find(([config]) => config.path === path);
  if (!call) {
    throw new Error(`No GET route registered for ${path}`);
  }
  return call[1];
};

const indexAlreadyExistsError = () =>
  new errors.ResponseError(
    elasticsearchServiceMock.createApiResponse({
      statusCode: 400,
      body: { error: { type: 'resource_already_exists_exception' } },
    })
  );

describe('PluginInitializeExampleServerPlugin', () => {
  afterEach(() => {
    started.splice(0).forEach((plugin) => plugin.stop());
    jest.useRealTimers();
  });

  describe('initialize()', () => {
    it('creates the index and writes the document', async () => {
      const { plugin } = createPlugin();
      const { core, client } = createCoreStart();

      await plugin.initialize(core);

      expect(client.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: INDEX_NAME })
      );
      expect(client.index).toHaveBeenCalledWith({
        index: INDEX_NAME,
        id: DOC_ID,
        document: { instanceUuid: 'instance-uuid', initializedAt: expect.any(String), attempt: 1 },
        refresh: true,
      });
    });

    it('tolerates the index having been created by another instance meanwhile', async () => {
      const { plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.indices.create.mockRejectedValueOnce(indexAlreadyExistsError());

      await plugin.initialize(core);

      expect(client.index).toHaveBeenCalledTimes(1);
    });

    it('propagates any other index creation error', async () => {
      const { plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.indices.create.mockRejectedValueOnce(new Error('cluster unavailable'));

      await expect(plugin.initialize(core)).rejects.toThrow('cluster unavailable');
      expect(client.index).not.toHaveBeenCalled();
    });

    it('fails the first failAttempts attempts with the simulated error, then succeeds', async () => {
      const { plugin } = createPlugin({ failAttempts: 2 });
      const { core, client } = createCoreStart();

      await expect(plugin.initialize(core)).rejects.toThrow(
        'Simulated initialize() failure 1 of 2'
      );
      await expect(plugin.initialize(core)).rejects.toThrow(
        'Simulated initialize() failure 2 of 2'
      );
      await expect(plugin.initialize(core)).resolves.toBeUndefined();

      expect(client.index).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({ document: expect.objectContaining({ attempt: 3 }) })
      );
    });
  });

  describe('start()', () => {
    it('returns the contract synchronously by default', () => {
      const { plugin } = createPlugin();

      const result = plugin.start(coreMock.createStart());

      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toEqual({
        getDoc: expect.any(Function),
        getInstanceInfo: expect.any(Function),
      });
    });

    it('returns a promise that resolves after slowStartMs when configured', async () => {
      jest.useFakeTimers();
      const { plugin } = createPlugin({ slowStartMs: 1500 });

      const result = plugin.start(coreMock.createStart());

      expect(result).toBeInstanceOf(Promise);
      jest.advanceTimersByTime(1500);
      await expect(result).resolves.toEqual({
        getDoc: expect.any(Function),
        getInstanceInfo: expect.any(Function),
      });
    });

    it('getDoc() waits for initialize() before reading; getInstanceInfo() never calls it', async () => {
      const { ctx, plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.get.mockResponse({ _index: INDEX_NAME, _id: DOC_ID, found: true, _source: doc });
      const { promise: initialized, resolve } = Promise.withResolvers<void>();
      ctx.initialization.initialize.mockReturnValue(initialized);

      const contract = await plugin.start(core);
      const pending = contract.getDoc();
      await Promise.resolve();
      expect(ctx.initialization.initialize).toHaveBeenCalledTimes(1);
      expect(client.get).not.toHaveBeenCalled();

      resolve();
      await expect(pending).resolves.toEqual(doc);
      expect(client.get).toHaveBeenCalledWith({ index: INDEX_NAME, id: DOC_ID });

      expect(contract.getInstanceInfo()).toEqual({
        instanceUuid: 'instance-uuid',
        status: { state: 'available', attempts: 0 },
      });
      expect(ctx.initialization.initialize).toHaveBeenCalledTimes(1);
    });

    it('getInstanceInfo() exposes what initialize() produced on this instance', async () => {
      const { plugin } = createPlugin();
      const { core } = createCoreStart();

      const contract = await plugin.start(core);
      await plugin.initialize(core);

      expect(contract.getInstanceInfo().instanceState).toEqual({
        initializedAt: expect.any(String),
        attempt: 1,
      });
    });

    it('the heartbeat logs only while available and never triggers initialize()', async () => {
      jest.useFakeTimers();
      const { ctx, plugin } = createPlugin();
      await plugin.start(coreMock.createStart());

      ctx.initialization.getStatus.mockReturnValue({ state: 'initializing', attempts: 0 });
      jest.advanceTimersByTime(60_000);
      expect(infoMessages(ctx)).not.toContainEqual(expect.stringContaining('heartbeat'));

      ctx.initialization.getStatus.mockReturnValue({ state: 'available', attempts: 0 });
      jest.advanceTimersByTime(60_000);
      expect(infoMessages(ctx)).toContainEqual(expect.stringContaining('heartbeat'));
      expect(ctx.initialization.initialize).not.toHaveBeenCalled();
    });
  });

  describe('status$', () => {
    it('logs every status transition until stop()', () => {
      const { ctx, plugin } = createPlugin();
      expect(infoMessages(ctx)).toEqual(['initialize() status: available (attempts: 0)']);

      ctx.initialization.status$.next({
        state: 'failed',
        attempts: 2,
        lastError: new Error('boom'),
      });
      expect(infoMessages(ctx)).toEqual([
        'initialize() status: available (attempts: 0)',
        'initialize() status: failed (attempts: 2, lastError: boom)',
      ]);

      plugin.stop();
      ctx.initialization.status$.next({ state: 'initializing', attempts: 2 });
      expect(infoMessages(ctx)).toHaveLength(2);
    });
  });

  describe('setup()', () => {
    const setupPlugin = () => {
      const { ctx, plugin } = createPlugin();
      const coreSetup = coreMock.createSetup();
      const router = httpServiceMock.createRouter();
      coreSetup.http.createRouter.mockReturnValue(router);
      // The core setup mock types `http.resources` loosely; register a fully typed registrar.
      const resources = httpResourcesMock.createRegistrar();
      plugin.setup({ ...coreSetup, http: { ...coreSetup.http, resources } });
      return { ctx, plugin, router, resources };
    };

    it('registers the API routes on the router and the health page through http.resources', () => {
      const { router, resources } = setupPlugin();

      expect(router.get.mock.calls.map(([config]) => config.path)).toEqual([
        DOC_ROUTE,
        STATUS_ROUTE,
      ]);
      expect(resources.register).toHaveBeenCalledTimes(1);
      expect(resources.register).toHaveBeenCalledWith(
        expect.objectContaining({ path: HEALTH_PATH }),
        expect.any(Function)
      );
    });

    it('the health page renders the current status, even while not available', async () => {
      const { ctx, resources } = setupPlugin();
      ctx.initialization.getStatus.mockReturnValue({
        state: 'failed',
        attempts: 3,
        lastError: new Error('boom'),
      });
      const [, handler] = resources.register.mock.calls[0];
      const response = httpResourcesMock.createResponseFactory();

      await handler({} as never, httpServerMock.createKibanaRequest(), response);

      expect(response.renderHtml).toHaveBeenCalledWith({ body: expect.stringContaining('failed') });
      expect(response.renderHtml).toHaveBeenCalledWith({ body: expect.stringContaining('boom') });
    });

    it('the status route serves the serialized own status', async () => {
      const { ctx, router } = setupPlugin();
      ctx.initialization.getStatus.mockReturnValue({ state: 'available', attempts: 1 });
      const response = httpServerMock.createResponseFactory();

      await findGetHandler(router, STATUS_ROUTE)(
        {} as never,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(response.ok).toHaveBeenCalledWith({ body: { state: 'available', attempts: 1 } });
    });

    it('the doc route reads through getDoc(), which waits for initialize()', async () => {
      const { ctx, plugin, router } = setupPlugin();
      const { core, client } = createCoreStart();
      client.get.mockResponse({ _index: INDEX_NAME, _id: DOC_ID, found: true, _source: doc });
      await plugin.start(core);
      const response = httpServerMock.createResponseFactory();

      await findGetHandler(router, DOC_ROUTE)(
        {} as never,
        httpServerMock.createKibanaRequest(),
        response
      );

      expect(ctx.initialization.initialize).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({ body: doc });
    });
  });
});
