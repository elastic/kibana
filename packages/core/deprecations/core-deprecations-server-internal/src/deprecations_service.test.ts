/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DeprecationsFactoryMock,
  registerConfigDeprecationsInfoMock,
} from './deprecations_service.test.mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { DeprecationsService, DeprecationsSetupDeps } from './deprecations_service';

describe('DeprecationsService', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let http: ReturnType<typeof httpServiceMock.createInternalSetupContract>;
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let deprecationsCoreSetupDeps: DeprecationsSetupDeps;
  let coreUsageData: ReturnType<typeof coreUsageDataServiceMock.createSetupContract>;

  beforeEach(() => {
    const configService = configServiceMock.create({
      atPath: { skip_deprecated_settings: ['hello', 'world'] },
    });
    coreContext = mockCoreContext.create({ configService });
    http = httpServiceMock.createInternalSetupContract();
    coreUsageData = coreUsageDataServiceMock.createSetupContract();
    router = httpServiceMock.createRouter();
    http.createRouter.mockReturnValue(router);
    deprecationsCoreSetupDeps = { http, coreUsageData };
  });

  afterEach(() => {
    jest.clearAllMocks();
    DeprecationsFactoryMock.mockClear();
    registerConfigDeprecationsInfoMock.mockClear();
  });

  describe('#setup', () => {
    it('registers routes', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      await deprecationsService.setup(deprecationsCoreSetupDeps);
      // registers correct base api path
      expect(http.createRouter).toBeCalledWith('/api/deprecations');
      // registers get route '/'
      expect(router.get).toHaveBeenCalledTimes(1);
      expect(router.get).toHaveBeenCalledWith(
        { options: { access: 'public' }, path: '/', validate: false },
        expect.any(Function)
      );
    });

    it('calls registerConfigDeprecationsInfo', async () => {
      const deprecationsService = new DeprecationsService(coreContext);
      await deprecationsService.setup(deprecationsCoreSetupDeps);
      expect(registerConfigDeprecationsInfoMock).toBeCalledTimes(1);
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
});
