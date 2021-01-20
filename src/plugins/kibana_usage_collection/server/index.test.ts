/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
