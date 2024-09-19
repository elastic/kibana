/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { DeprecationsService } from './deprecations_service';
import { httpServiceMock } from '../http/http_service.mock';
import { mockRouter } from '../http/router/router.mock';
import { savedObjectsClientMock, elasticsearchServiceMock } from '../mocks';
import { mockCoreContext } from '../core_context.mock';
import { mockDeprecationsFactory } from './deprecations_factory.mock';
import { mockDeprecationsRegistry } from './deprecations_registry.mock';

describe('DeprecationsService', () => {
  const coreContext = mockCoreContext.create();
  const http = httpServiceMock.createInternalSetupContract();
  const router = mockRouter.create();
  http.createRouter.mockReturnValue(router);
  const deprecationsCoreSetupDeps = { http };

  beforeEach(() => jest.clearAllMocks());

  describe('#setup', () => {
    it('registers routes', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      deprecationsService.setup(deprecationsCoreSetupDeps);
      // Registers correct base api path
      expect(http.createRouter).toBeCalledWith('/api/deprecations');
      // registers get route '/'
      expect(router.get).toHaveBeenCalledTimes(1);
      expect(router.get).toHaveBeenCalledWith({ path: '/', validate: false }, expect.any(Function));
    });

    it('calls registerConfigDeprecationsInfo', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      const mockRegisterConfigDeprecationsInfo = jest.fn();
      deprecationsService['registerConfigDeprecationsInfo'] = mockRegisterConfigDeprecationsInfo;
      deprecationsService.setup(deprecationsCoreSetupDeps);
      expect(mockRegisterConfigDeprecationsInfo).toBeCalledTimes(1);
    });
  });

  describe('#start', () => {
    describe('#asScopedToClient', () => {
      it('returns client with #getAllDeprecations method', async () => {
        const esClient = elasticsearchServiceMock.createScopedClusterClient();
        const savedObjectsClient = savedObjectsClientMock.create();
        const deprecationsService = new DeprecationsService(coreContext);

        deprecationsService.setup(deprecationsCoreSetupDeps);

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
