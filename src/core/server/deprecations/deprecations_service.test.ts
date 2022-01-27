/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecationsFactoryMock } from './deprecations_service.test.mocks';

/* eslint-disable dot-notation */
import { DeprecationsService, DeprecationsSetupDeps } from './deprecations_service';
import { httpServiceMock } from '../http/http_service.mock';
import { savedObjectsClientMock, elasticsearchServiceMock, configServiceMock } from '../mocks';
import { mockCoreContext } from '../core_context.mock';
import { mockDeprecationsFactory } from './deprecations_factory.mock';
import { mockDeprecationsRegistry } from './deprecations_registry.mock';

describe('DeprecationsService', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let http: ReturnType<typeof httpServiceMock.createInternalSetupContract>;
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let deprecationsCoreSetupDeps: DeprecationsSetupDeps;

  beforeEach(() => {
    const configService = configServiceMock.create({
      atPath: { skip_deprecated_settings: ['hello', 'world'] },
    });
    coreContext = mockCoreContext.create({ configService });
    http = httpServiceMock.createInternalSetupContract();
    router = httpServiceMock.createRouter();
    http.createRouter.mockReturnValue(router);
    deprecationsCoreSetupDeps = { http };
  });

  afterEach(() => {
    jest.clearAllMocks();
    DeprecationsFactoryMock.mockClear();
  });

  describe('#setup', () => {
    it('registers routes', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      await deprecationsService.setup(deprecationsCoreSetupDeps);
      // registers correct base api path
      expect(http.createRouter).toBeCalledWith('/api/deprecations');
      // registers get route '/'
      expect(router.get).toHaveBeenCalledTimes(1);
      expect(router.get).toHaveBeenCalledWith({ path: '/', validate: false }, expect.any(Function));
    });

    it('calls registerConfigDeprecationsInfo', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      const mockRegisterConfigDeprecationsInfo = jest.fn();
      deprecationsService['registerConfigDeprecationsInfo'] = mockRegisterConfigDeprecationsInfo;
      await deprecationsService.setup(deprecationsCoreSetupDeps);
      expect(mockRegisterConfigDeprecationsInfo).toBeCalledTimes(1);
    });

    it('creates DeprecationsFactory with the correct parameters', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      await deprecationsService.setup(deprecationsCoreSetupDeps);

      expect(DeprecationsFactoryMock).toHaveBeenCalledTimes(1);
      expect(DeprecationsFactoryMock).toHaveBeenCalledWith({
        logger: expect.any(Object),
        config: {
          ignoredConfigDeprecations: ['hello', 'world'],
        },
      });
    });
  });

  describe('#start', () => {
    describe('#asScopedToClient', () => {
      it('returns client with #getAllDeprecations method', async () => {
        const esClient = elasticsearchServiceMock.createScopedClusterClient();
        const savedObjectsClient = savedObjectsClientMock.create();
        const deprecationsService = new DeprecationsService(coreContext);

        await deprecationsService.setup(deprecationsCoreSetupDeps);

        const start = deprecationsService.start();
        const deprecationsClient = start.asScopedToClient(esClient, savedObjectsClient);

        expect(deprecationsClient.getAllDeprecations).toBeDefined();
      });
    });
  });

  describe('#registerConfigDeprecationsInfo', () => {
    const deprecationsFactory = mockDeprecationsFactory.create();
    const deprecationsRegistry = mockDeprecationsRegistry.create();
    const getDeprecationsContext = mockDeprecationsRegistry.createGetDeprecationsContext();

    it('registers config deprecations', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      coreContext.configService.getHandledDeprecatedConfigs.mockReturnValue([
        [
          'testDomain',
          [
            {
              configPath: 'test',
              level: 'critical',
              message: 'testMessage',
              documentationUrl: 'testDocUrl',
              correctiveActions: {
                manualSteps: [
                  'Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.',
                  'Using Kibana role-mapping management, change all role-mappings which assign the kibana_user role to the kibana_admin role.',
                ],
              },
            },
          ],
        ],
      ]);

      deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
      deprecationsService['registerConfigDeprecationsInfo'](deprecationsFactory);

      expect(coreContext.configService.getHandledDeprecatedConfigs).toBeCalledTimes(1);
      expect(deprecationsFactory.getRegistry).toBeCalledTimes(1);
      expect(deprecationsFactory.getRegistry).toBeCalledWith('testDomain');
      expect(deprecationsRegistry.registerDeprecations).toBeCalledTimes(1);
      const configDeprecations =
        await deprecationsRegistry.registerDeprecations.mock.calls[0][0].getDeprecations(
          getDeprecationsContext
        );
      expect(configDeprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "configPath": "test",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.",
                "Using Kibana role-mapping management, change all role-mappings which assign the kibana_user role to the kibana_admin role.",
              ],
            },
            "deprecationType": "config",
            "documentationUrl": "testDocUrl",
            "level": "critical",
            "message": "testMessage",
            "requireRestart": true,
            "title": "testDomain has a deprecated setting",
          },
        ]
      `);
    });

    it('accepts `level` field overrides', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      coreContext.configService.getHandledDeprecatedConfigs.mockReturnValue([
        [
          'testDomain',
          [
            {
              configPath: 'test',
              message: 'testMessage',
              level: 'warning',
              correctiveActions: {
                manualSteps: ['step a'],
              },
            },
          ],
        ],
      ]);

      deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
      deprecationsService['registerConfigDeprecationsInfo'](deprecationsFactory);

      const configDeprecations =
        await deprecationsRegistry.registerDeprecations.mock.calls[0][0].getDeprecations(
          getDeprecationsContext
        );
      expect(configDeprecations[0].level).toBe('warning');
    });
  });
});
