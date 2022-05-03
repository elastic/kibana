/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup } from '@kbn/core/server';

import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { customIntegrationsMock } from '@kbn/custom-integrations-plugin/server/mocks';
import { SampleDataRegistry } from './sample_data_registry';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server/plugin';
import { coreMock } from '@kbn/core/server/mocks';

describe('SampleDataRegistry', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let mockCustomIntegrationsPluginSetup: jest.Mocked<CustomIntegrationsPluginSetup>;
  let mockUsageCollectionPluginSetup: MockedKeys<UsageCollectionSetup>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCustomIntegrationsPluginSetup = customIntegrationsMock.createSetup();
    mockUsageCollectionPluginSetup = usageCollectionPluginMock.createSetupContract();
  });

  describe('setup', () => {
    let sampleDataRegistry: SampleDataRegistry;
    beforeEach(() => {
      const initContext = coreMock.createPluginInitializerContext();
      sampleDataRegistry = new SampleDataRegistry(initContext);
    });

    test('should register the three sample datasets', () => {
      const setup = sampleDataRegistry.setup(
        mockCoreSetup,
        mockUsageCollectionPluginSetup,
        mockCustomIntegrationsPluginSetup
      );

      const datasets = setup.getSampleDatasets();
      expect(datasets[0].id).toEqual('flights');
      expect(datasets[2].id).toEqual('ecommerce');
      expect(datasets[1].id).toEqual('logs');
    });

    test('should register the three sample datasets as single card', () => {
      sampleDataRegistry.setup(
        mockCoreSetup,
        mockUsageCollectionPluginSetup,
        mockCustomIntegrationsPluginSetup
      );
      const ids: string[] =
        mockCustomIntegrationsPluginSetup.registerCustomIntegration.mock.calls.map((args) => {
          return args[0].id;
        });
      expect(ids).toEqual(['sample_data_all']);
    });
  });
});
