/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
