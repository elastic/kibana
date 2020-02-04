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

import { registryMock, environmentMock } from './plugin.test.mocks';
import { HomePublicPlugin } from './plugin';
import { coreMock } from '../../../core/public/mocks';

const mockInitializerContext = coreMock.createPluginInitializerContext();

describe('HomePublicPlugin', () => {
  beforeEach(() => {
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
    environmentMock.setup.mockClear();
    environmentMock.start.mockClear();
  });

  describe('setup', () => {
    test('wires up and returns registry', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup();
      expect(setup).toHaveProperty('featureCatalogue');
      expect(setup.featureCatalogue).toHaveProperty('register');
    });

    test('wires up and returns environment service', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup();
      expect(setup).toHaveProperty('environment');
      expect(setup.environment).toHaveProperty('update');
    });
  });

  describe('start', () => {
    test('wires up and returns registry', async () => {
      const service = new HomePublicPlugin(mockInitializerContext);
      await service.setup();
      const core = { application: { capabilities: { catalogue: {} } } } as any;
      const start = await service.start(core);
      expect(registryMock.start).toHaveBeenCalledWith({
        capabilities: core.application.capabilities,
      });
      expect(start.featureCatalogue.get).toBeDefined();
    });

    test('wires up and returns environment service', async () => {
      const service = new HomePublicPlugin(mockInitializerContext);
      await service.setup();
      const start = await service.start({
        application: { capabilities: { catalogue: {} } },
      } as any);
      expect(environmentMock.start).toHaveBeenCalled();
      expect(start.environment.get).toBeDefined();
    });
  });
});
