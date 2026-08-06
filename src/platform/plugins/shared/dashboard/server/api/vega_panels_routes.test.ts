/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { z } from '@kbn/zod';
import { createConfigService, createCoreContext } from '@kbn/core-http-server-mocks';
import { ContextService } from '@kbn/core-http-context-server-internal';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { HttpService } from '@kbn/core-http-server-internal';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { coreFeatureFlagsMock } from '@kbn/core/server/mocks';

import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { logger } from '../kibana_services';
import { setStubKibanaServices } from '../mocks';
import { registerCreateRoute } from './create/register_create_route';
import { registerReadRoute } from './read/register_read_route';
import { registerUpdateRoute } from './update/register_update_route';

const defaultCoreId = Symbol('core');

function createCoreServerRequestHandlerContextMock() {
  return {
    savedObjects: {
      client: savedObjectsClientMock.create(),
      typeRegistry: typeRegistryMock.create(),
      getClient: savedObjectsClientMock.create,
      getExporter: savedObjectsServiceMock.createExporter,
      getImporter: savedObjectsServiceMock.createImporter,
    },
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    uiSettings: {
      client: uiSettingsServiceMock.createClient(),
    },
    deprecations: {
      client: deprecationsServiceMock.createClient(),
    },
  };
}

const setupEphemeralServer = async (coreId: symbol = defaultCoreId) => {
  const coreContext = createCoreContext({
    coreId,
    configService: createConfigService({ server: { port: 0 } }),
  });

  const contextService = new ContextService(coreContext);
  const httpService = new HttpService(coreContext);
  await httpService.preboot({
    context: contextServiceMock.createPrebootContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
  });

  const httpSetup = await httpService.setup({
    context: contextService.setup({ pluginDependencies: new Map() }),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    userActivity: userActivityServiceMock.createInternalSetupContract(),
  });

  const handlerContext = createCoreServerRequestHandlerContextMock();
  httpSetup.registerRouteHandlerContext<any, 'core'>(coreId, 'core', () => handlerContext);

  return {
    server: {
      listener: httpSetup.server.listener,
      start: async () => {
        await httpService.start();
      },
      stop: async () => {
        await httpService.stop();
      },
    },
    createRouter: httpSetup.createRouter.bind(httpSetup),
    handlerContext,
  };
};

type EphemeralSetupServerReturn = Awaited<ReturnType<typeof setupEphemeralServer>>;

const vegaConfigSchema = z
  .object({
    spec: z.string().min(1),
  })
  .strip();

const dummyMarkdownSchema = z.object({}).strip();

const vegaPanel = {
  type: 'vega',
  grid: { x: 0, y: 0, w: 24, h: 15 },
  config: { spec: '{ mark: point }' },
} as const;

const dashboardAttributesWithVega: DashboardSavedObjectAttributes = {
  pinned_panels: { panels: {} },
  description: 'description',
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: 'test', language: 'KQL' } }),
  },
  optionsJSON: JSON.stringify({}),
  panelsJSON: JSON.stringify([
    {
      type: 'vega',
      embeddableConfig: { spec: '{ mark: point }' },
      panelIndex: 'panel-1',
      gridData: { h: 15, i: 'panel-1', w: 24, x: 0, y: 0 },
    },
  ]),
  refreshInterval: { pause: true, value: 1000 },
  sections: [],
  timeFrom: 'now-15m',
  timeRestore: true,
  timeTo: 'now',
  title: 'title',
};

const setVegaEmbeddableSchemasEnabled = (enabled: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../kibana_services').embeddableService = {
    getAllEmbeddableSchemas: jest.fn().mockReturnValue(
      enabled
        ? {
            markdown: { title: 'Markdown', schema: dummyMarkdownSchema },
            vega: { title: 'Vega', schema: vegaConfigSchema },
          }
        : {
            markdown: { title: 'Markdown', schema: dummyMarkdownSchema },
          }
    ),
    getTransforms: jest.fn().mockImplementation((type: string) => {
      if (!enabled) return undefined;
      if (type === 'vega') return { schema: vegaConfigSchema };
      return undefined;
    }),
  };
};

describe('dashboards API (vega panel schema)', () => {
  beforeAll(() => {
    setStubKibanaServices();
  });

  describe('POST /api/dashboards', () => {
    let server: EphemeralSetupServerReturn['server'];
    let createRouter: EphemeralSetupServerReturn['createRouter'];
    let handlerContext: EphemeralSetupServerReturn['handlerContext'];
    let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(async () => {
      ({ server, createRouter, handlerContext } = await setupEphemeralServer());
      savedObjectsClient = handlerContext.savedObjects.client;
      const { versioned } = createRouter<RequestHandlerContext>('/');
      registerCreateRoute(versioned, undefined, false, logger);

      Object.assign(handlerContext, {
        featureFlags: coreFeatureFlagsMock.createRequestHandlerContext(),
      });

      savedObjectsClient.create.mockResolvedValue({
        id: 'test-dashboard',
        type: 'dashboard',
        attributes: dashboardAttributesWithVega,
        references: [],
      });

      await server.start();
    });

    afterEach(async () => {
      jest.clearAllMocks();
      await server.stop();
    });

    it('accepts type: vega when enabled', async () => {
      setVegaEmbeddableSchemasEnabled(true);
      const result = await supertest(server.listener)
        .post('/api/dashboards')
        .send({ title: 'title', panels: [vegaPanel] });
      expect(result.status).toEqual(201);
    });

    it('rejects vega panels missing spec when enabled', async () => {
      setVegaEmbeddableSchemasEnabled(true);
      const result = await supertest(server.listener)
        .post('/api/dashboards')
        .send({
          title: 'title',
          panels: [
            {
              ...vegaPanel,
              config: {},
            },
          ],
        });
      expect(result.status).toEqual(400);
    });

    it('rejects type: vega when disabled', async () => {
      setVegaEmbeddableSchemasEnabled(false);
      const result = await supertest(server.listener)
        .post('/api/dashboards')
        .send({ title: 'title', panels: [vegaPanel] });
      expect(result.status).toEqual(400);
    });
  });

  describe('PUT /api/dashboards/{id}', () => {
    let server: EphemeralSetupServerReturn['server'];
    let createRouter: EphemeralSetupServerReturn['createRouter'];
    let handlerContext: EphemeralSetupServerReturn['handlerContext'];
    let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(async () => {
      ({ server, createRouter, handlerContext } = await setupEphemeralServer());
      savedObjectsClient = handlerContext.savedObjects.client;
      const { versioned } = createRouter<RequestHandlerContext>('/');
      registerUpdateRoute(versioned, undefined, false, logger);

      Object.assign(handlerContext, {
        featureFlags: coreFeatureFlagsMock.createRequestHandlerContext(),
      });

      savedObjectsClient.get.mockResolvedValue({
        id: 'test-dashboard',
        type: 'dashboard',
        attributes: dashboardAttributesWithVega,
        references: [],
      });
      savedObjectsClient.update.mockResolvedValue({
        id: 'test-dashboard',
        type: 'dashboard',
        attributes: dashboardAttributesWithVega,
        references: [],
      });

      await server.start();
    });

    afterEach(async () => {
      jest.clearAllMocks();
      await server.stop();
    });

    it('accepts type: vega when enabled', async () => {
      setVegaEmbeddableSchemasEnabled(true);

      const result = await supertest(server.listener)
        .put('/api/dashboards/test-dashboard')
        .send({ title: 'title', panels: [vegaPanel] });

      expect(result.status).toEqual(200);
    });

    it('rejects vega panels missing spec when enabled', async () => {
      setVegaEmbeddableSchemasEnabled(true);

      const result = await supertest(server.listener)
        .put('/api/dashboards/test-dashboard')
        .send({
          title: 'title',
          panels: [
            {
              ...vegaPanel,
              config: {},
            },
          ],
        });

      expect(result.status).toEqual(400);
    });

    it('rejects type: vega when disabled', async () => {
      setVegaEmbeddableSchemasEnabled(false);

      const result = await supertest(server.listener)
        .put('/api/dashboards/test-dashboard')
        .send({ title: 'title', panels: [vegaPanel] });

      expect(result.status).toEqual(400);
    });
  });

  describe('GET /api/dashboards/{id}', () => {
    let server: EphemeralSetupServerReturn['server'];
    let createRouter: EphemeralSetupServerReturn['createRouter'];
    let handlerContext: EphemeralSetupServerReturn['handlerContext'];
    let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(async () => {
      ({ server, createRouter, handlerContext } = await setupEphemeralServer());
      savedObjectsClient = handlerContext.savedObjects.client;
      const { versioned } = createRouter<RequestHandlerContext>('/');
      registerReadRoute(versioned, undefined, false, logger);

      Object.assign(handlerContext, {
        featureFlags: coreFeatureFlagsMock.createRequestHandlerContext(),
      });

      savedObjectsClient.resolve.mockResolvedValue({
        saved_object: {
          id: 'test-dashboard',
          type: 'dashboard',
          attributes: dashboardAttributesWithVega,
          references: [],
        },
        outcome: 'exactMatch',
        alias_purpose: undefined,
        alias_target_id: undefined,
      });

      await server.start();
    });

    afterEach(async () => {
      jest.clearAllMocks();
      await server.stop();
    });

    it('returns stored vega panels without dropped_panel warning when enabled', async () => {
      setVegaEmbeddableSchemasEnabled(true);

      const result = await supertest(server.listener).get('/api/dashboards/test-dashboard');

      expect(result.status).toEqual(200);
      expect(result.body.data.panels).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'vega' })])
      );
      expect(result.body.warnings).toBeUndefined();
    });

    it('drops stored vega panels with dropped_panel warning when disabled', async () => {
      setVegaEmbeddableSchemasEnabled(false);

      const result = await supertest(server.listener).get('/api/dashboards/test-dashboard');

      expect(result.status).toEqual(200);
      expect(result.body.data.panels).toEqual([]);
      expect(result.body.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'dropped_panel', panel_type: 'vega' }),
        ])
      );
    });
  });
});
