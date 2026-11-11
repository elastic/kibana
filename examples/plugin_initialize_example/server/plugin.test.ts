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
  httpServerMock,
  httpServiceMock,
} from '@kbn/core/server/mocks';
import type { PluginInitializeExampleConfig } from './config';
import { DOC_ID, DOC_ROUTE, INDEX_NAME, PluginInitializeExampleServerPlugin } from './plugin';

type RouterMock = ReturnType<typeof httpServiceMock.createRouter>;

const doc = { instanceUuid: 'instance-uuid', initializedAt: '2026-01-01T00:00:00.000Z' };

const createPlugin = (overrides: Partial<PluginInitializeExampleConfig> = {}) => {
  const ctx = coreMock.createPluginInitializerContext<PluginInitializeExampleConfig>({
    initDelayMs: 0,
    failInitialize: false,
    ...overrides,
  });
  return { ctx, plugin: new PluginInitializeExampleServerPlugin(ctx) };
};

// The core start mock types the internal client loosely; the elasticsearch mock exposes it fully.
const createCoreStart = () => {
  const elasticsearch = elasticsearchServiceMock.createStart();
  return {
    core: { ...coreMock.createStart(), elasticsearch },
    client: elasticsearch.client.asInternalUser,
  };
};

const setupRoutes = (plugin: PluginInitializeExampleServerPlugin) => {
  const core = coreMock.createSetup();
  const router: RouterMock = httpServiceMock.createRouter();
  core.http.createRouter.mockReturnValue(router);
  plugin.setup(core);
  return router;
};

const findGetHandler = (router: RouterMock, path: string) => {
  const call = router.get.mock.calls.find(([config]) => config.path === path);
  if (!call) {
    throw new Error(`No GET route registered for ${path}`);
  }
  return call[1];
};

const callGetRoute = async (router: RouterMock, path: string) => {
  const response = httpServerMock.createResponseFactory();
  await findGetHandler(router, path)({} as never, httpServerMock.createKibanaRequest(), response);
  return response;
};

describe('PluginInitializeExampleServerPlugin', () => {
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
        document: { instanceUuid: 'instance-uuid', initializedAt: expect.any(String) },
        refresh: true,
      });
    });

    it('tolerates the index having been created by another instance', async () => {
      const { plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.indices.create.mockRejectedValueOnce(
        new errors.ResponseError(
          elasticsearchServiceMock.createApiResponse({
            statusCode: 400,
            body: { error: { type: 'resource_already_exists_exception' } },
          })
        )
      );

      await plugin.initialize(core);

      expect(client.index).toHaveBeenCalledTimes(1);
    });

    it('throws any other index creation error', async () => {
      const { plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.indices.create.mockRejectedValueOnce(new Error('cluster unavailable'));

      await expect(plugin.initialize(core)).rejects.toThrow('cluster unavailable');
      expect(client.index).not.toHaveBeenCalled();
    });

    it('throws the simulated failure when failInitialize is set', async () => {
      const { plugin } = createPlugin({ failInitialize: true });
      const { core, client } = createCoreStart();

      await expect(plugin.initialize(core)).rejects.toThrow('Simulated initialize() failure');
      expect(client.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('routes', () => {
    it('the doc route waits for initialize() before reading the document', async () => {
      const { ctx, plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.get.mockResolvedValue({ _index: INDEX_NAME, _id: DOC_ID, found: true, _source: doc });
      const router = setupRoutes(plugin);
      plugin.start(core);

      const response = await callGetRoute(router, DOC_ROUTE);

      expect(ctx.initialization.initialize).toHaveBeenCalledTimes(1);
      expect(ctx.initialization.initialize.mock.invocationCallOrder[0]).toBeLessThan(
        client.get.mock.invocationCallOrder[0]
      );
      expect(response.ok).toHaveBeenCalledWith({ body: doc });
    });

    it('the doc route fails when initialize() fails', async () => {
      const { ctx, plugin } = createPlugin();
      const { core, client } = createCoreStart();
      ctx.initialization.initialize.mockRejectedValue(new Error('initialize() failed'));
      const router = setupRoutes(plugin);
      plugin.start(core);

      await expect(callGetRoute(router, DOC_ROUTE)).rejects.toThrow('initialize() failed');
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  describe('start contract', () => {
    it('getDoc() waits for initialize() before reading the document', async () => {
      const { ctx, plugin } = createPlugin();
      const { core, client } = createCoreStart();
      client.get.mockResolvedValue({ _index: INDEX_NAME, _id: DOC_ID, found: true, _source: doc });

      const contract = plugin.start(core);

      await expect(contract.getDoc()).resolves.toEqual(doc);
      expect(ctx.initialization.initialize.mock.invocationCallOrder[0]).toBeLessThan(
        client.get.mock.invocationCallOrder[0]
      );
    });
  });
});
