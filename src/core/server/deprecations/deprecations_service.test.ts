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
import { mockCoreContext } from '../core_context.mock';
import { DeprecationsFactory } from './deprecations_factory';

describe('DeprecationsService', () => {
  const coreContext = mockCoreContext.create();
  describe('#setup', () => {
    const http = httpServiceMock.createInternalSetupContract();
    const router = mockRouter.create();
    http.createRouter.mockReturnValue(router);
    const deprecationsCoreSetupDeps = { http };

    it('registers routes', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      deprecationsService.setup(deprecationsCoreSetupDeps);
      // Registers correct base api path
      expect(http.createRouter).toBeCalledWith('/api/deprecations');
      // registers get route '/'
      expect(router.get.mock.calls[0][0]).toEqual({ path: '/', validate: false });
      expect(router.get.mock.calls[0][1]).toBeInstanceOf(Function);
    });

    it('calls registerConfigDeprecationsInfo', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      const mockRegisterConfigDeprecationsInfo = jest.fn();
      deprecationsService['registerConfigDeprecationsInfo'] = mockRegisterConfigDeprecationsInfo;
      deprecationsService.setup(deprecationsCoreSetupDeps);
      expect(mockRegisterConfigDeprecationsInfo).toBeCalledTimes(1);
    });

    it('returns setup contract', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      const internalSetupContract = deprecationsService.setup(deprecationsCoreSetupDeps);
      expect(internalSetupContract).toMatchInlineSnapshot(`
        Object {
          "getRegistry": [Function],
        }
      `);
      const externalSetupContract = internalSetupContract.getRegistry('someDomain');

      expect(externalSetupContract).toMatchInlineSnapshot(`
        Object {
          "registerDeprecations": [Function],
        }
      `);
    });
  });

  describe('#registerConfigDeprecationsInfo', () => {
    it('registers config deprecations', () => {
      const deprecationsService = new DeprecationsService(coreContext);
      const mockGetHandledDeprecatedConfigs = jest.fn().mockReturnValue([
        [
          'testDomain',
          [
            {
              message: 'testMessage',
              documentationUrl: 'testDocUrl',
              correctiveActions: {
                manualSteps: [
                  'Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.',
                  'Using Kibana role-mapping management, change all role-mappings which assing the kibana_user role to the kibana_admin role.',
                ],
              },
            },
          ],
        ],
      ]);
      const mockRegisterDeprecations = jest.fn();
      const mockGetRegistry = jest.fn().mockReturnValue({
        registerDeprecations: mockRegisterDeprecations,
      });

      coreContext.configService.getHandledDeprecatedConfigs = mockGetHandledDeprecatedConfigs;
      const deprecationsFactory = new DeprecationsFactory({
        logger: deprecationsService['logger'],
      });

      deprecationsFactory.getRegistry = mockGetRegistry;
      deprecationsService['registerConfigDeprecationsInfo'](deprecationsFactory);

      expect(mockGetHandledDeprecatedConfigs).toBeCalledTimes(1);
      expect(mockGetRegistry).toBeCalledTimes(1);
      expect(mockGetRegistry).toBeCalledWith('testDomain');
      expect(mockRegisterDeprecations).toBeCalledTimes(1);

      expect(mockRegisterDeprecations.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "getDeprecations": [Function],
          },
        ]
      `);

      const configDeprecations = mockRegisterDeprecations.mock.calls[0][0].getDeprecations();
      expect(configDeprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "correctiveActions": Object {
              "manualSteps": Array [
                "Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.",
                "Using Kibana role-mapping management, change all role-mappings which assing the kibana_user role to the kibana_admin role.",
              ],
            },
            "deprecationType": "config",
            "documentationUrl": "testDocUrl",
            "level": "critical",
            "message": "testMessage",
          },
        ]
      `);
    });
  });
});
