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
import { coreMock } from '../../../core/server/mocks';
import { CoreSetup } from '../../../core/server';

type MockedKeys<T> = { [P in keyof T]: jest.Mocked<T[P]> };

describe('HomeServerPlugin', () => {
  beforeEach(() => {
    registryForTutorialsMock.setup.mockClear();
    registryForTutorialsMock.start.mockClear();
    registryForSampleDataMock.setup.mockClear();
    registryForSampleDataMock.start.mockClear();
  });

  describe('setup', () => {
    const mockCoreSetup: MockedKeys<CoreSetup> = coreMock.createSetup();
    const initContext = coreMock.createPluginInitializerContext();

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
