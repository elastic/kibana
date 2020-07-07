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

import {
  coreMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '../../../core/server/mocks';
import {
  CollectorOptions,
  createUsageCollectionSetupMock,
} from '../../usage_collection/server/usage_collection.mock';

import { plugin } from './';

describe('kibana_usage_collection', () => {
  const pluginInstance = plugin(coreMock.createPluginInitializerContext({}));

  const usageCollectors: CollectorOptions[] = [];

  const usageCollection = createUsageCollectionSetupMock();
  usageCollection.makeUsageCollector.mockImplementation((opts) => {
    usageCollectors.push(opts);
    return createUsageCollectionSetupMock().makeUsageCollector(opts);
  });
  usageCollection.makeStatsCollector.mockImplementation((opts) => {
    usageCollectors.push(opts);
    return createUsageCollectionSetupMock().makeStatsCollector(opts);
  });

  test('Runs the setup method without issues', () => {
    const coreSetup = coreMock.createSetup();

    expect(pluginInstance.setup(coreSetup, { usageCollection })).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toMatchSnapshot(); // Some should return false at this stage
    });
  });

  test('Runs the start method without issues', () => {
    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockImplementation(() =>
      savedObjectsRepositoryMock.create()
    );
    coreStart.uiSettings.asScopedToClient.mockImplementation(() =>
      uiSettingsServiceMock.createClient()
    );

    expect(pluginInstance.start(coreStart)).toBe(undefined);
    usageCollectors.forEach(({ isReady }) => {
      expect(isReady()).toBe(true); // All should return true at this point
    });
  });

  test('Runs the stop method without issues', () => {
    expect(pluginInstance.stop()).toBe(undefined);
  });
});
