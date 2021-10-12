/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup } from '../../../../../core/server';

import { CustomIntegrationsPluginSetup } from '../../../../custom_integrations/server';
import { customIntegrationsMock } from '../../../../custom_integrations/server/mocks';
import { SampleDataRegistry } from './sample_data_registry';
import { usageCollectionPluginMock } from '../../../../usage_collection/server/mocks';
import { UsageCollectionSetup } from '../../../../usage_collection/server/plugin';
import { coreMock } from '../../../../../core/server/mocks';

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
    test('should register the three sample datasets', () => {
      const initContext = coreMock.createPluginInitializerContext();
      const plugin = new SampleDataRegistry(initContext);
      plugin.setup(
        mockCoreSetup,
        mockUsageCollectionPluginSetup,
        mockCustomIntegrationsPluginSetup
      );

      const ids: string[] =
        mockCustomIntegrationsPluginSetup.registerCustomIntegration.mock.calls.map((args) => {
          return args[0].id;
        });
      expect(ids).toEqual(['flights', 'logs', 'ecommerce']);
    });
  });
});
