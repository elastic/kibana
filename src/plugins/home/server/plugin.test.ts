/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { registryForTutorialsMock, registryForSampleDataMock } from './plugin.test.mocks';
import { HomeServerPlugin } from './plugin';
import { coreMock, httpServiceMock } from '../../../core/server/mocks';

describe('HomeServerPlugin', () => {
  beforeEach(() => {
    registryForTutorialsMock.setup.mockClear();
    registryForTutorialsMock.start.mockClear();
    registryForSampleDataMock.setup.mockClear();
    registryForSampleDataMock.start.mockClear();
  });

  describe('setup', () => {
    let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
    let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
    let routerMock: ReturnType<typeof httpServiceMock.createRouter>;

    beforeEach(() => {
      mockCoreSetup = coreMock.createSetup();
      routerMock = httpServiceMock.createRouter();
      mockCoreSetup.http.createRouter.mockReturnValue(routerMock);
      initContext = coreMock.createPluginInitializerContext();
    });

    test('wires up tutorials provider service and returns registerTutorial and addScopedTutorialContextFactory', () => {
      const setup = new HomeServerPlugin(initContext).setup(mockCoreSetup, {});
      expect(setup).toHaveProperty('tutorials');
      expect(setup.tutorials).toHaveProperty('registerTutorial');
      expect(setup.tutorials).toHaveProperty('addScopedTutorialContextFactory');
    });

    test('wires up sample data provider service and returns registerTutorial and addScopedTutorialContextFactory', () => {
      const setup = new HomeServerPlugin(initContext).setup(mockCoreSetup, {});
      expect(setup).toHaveProperty('sampleData');
      expect(setup.sampleData).toHaveProperty('registerSampleDataset');
      expect(setup.sampleData).toHaveProperty('getSampleDatasets');
      expect(setup.sampleData).toHaveProperty('addSavedObjectsToSampleDataset');
      expect(setup.sampleData).toHaveProperty('addAppLinksToSampleDataset');
      expect(setup.sampleData).toHaveProperty('replacePanelInSampleDatasetDashboard');
    });

    test('registers the `/api/home/hits_status` route', () => {
      new HomeServerPlugin(initContext).setup(mockCoreSetup, {});

      expect(routerMock.post).toHaveBeenCalledTimes(1);
      expect(routerMock.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/home/hits_status',
        }),
        expect.any(Function)
      );
    });
  });

  describe('start', () => {
    const initContext = coreMock.createPluginInitializerContext();
    test('is defined', () => {
      const start = new HomeServerPlugin(initContext).start();
      expect(start).toBeDefined();
      expect(start).toHaveProperty('tutorials');
      expect(start).toHaveProperty('sampleData');
    });
  });
});
