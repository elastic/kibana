/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registryMock, environmentMock, tutorialMock } from './plugin.test.mocks';
import { HomePublicPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { urlForwardingPluginMock } from '@kbn/url-forwarding-plugin/public/mocks';
import { SharePluginSetup } from '@kbn/share-plugin/public';

const mockInitializerContext = coreMock.createPluginInitializerContext();
const mockShare = {} as SharePluginSetup;

describe('HomePublicPlugin', () => {
  beforeEach(() => {
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
    tutorialMock.setup.mockClear();
    environmentMock.setup.mockClear();
  });

  describe('setup', () => {
    test('registers tutorial directory to feature catalogue', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup(
        coreMock.createSetup() as any,
        {
          share: mockShare,
          urlForwarding: urlForwardingPluginMock.createSetupContract(),
        }
      );
      expect(setup).toHaveProperty('featureCatalogue');
      expect(setup.featureCatalogue.register).toHaveBeenCalledTimes(1);
      expect(setup.featureCatalogue.register).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'data',
          icon: 'indexOpen',
          id: 'home_tutorial_directory',
          showOnHomePage: true,
        })
      );
    });

    test('wires up and returns registry', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup(
        coreMock.createSetup() as any,
        {
          share: mockShare,
          urlForwarding: urlForwardingPluginMock.createSetupContract(),
        }
      );
      expect(setup).toHaveProperty('featureCatalogue');
      expect(setup.featureCatalogue).toHaveProperty('register');
    });

    test('wires up and returns environment service', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup(
        coreMock.createSetup() as any,
        {
          share: {} as SharePluginSetup,
          urlForwarding: urlForwardingPluginMock.createSetupContract(),
        }
      );
      expect(setup).toHaveProperty('environment');
      expect(setup.environment).toHaveProperty('update');
    });

    test('wires up and returns tutorial service', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup(
        coreMock.createSetup() as any,
        {
          share: mockShare,
          urlForwarding: urlForwardingPluginMock.createSetupContract(),
        }
      );
      expect(setup).toHaveProperty('tutorials');
      expect(setup.tutorials).toHaveProperty('setVariable');
    });

    test('wires up and returns welcome service', async () => {
      const setup = await new HomePublicPlugin(mockInitializerContext).setup(
        coreMock.createSetup() as any,
        {
          share: mockShare,
          urlForwarding: urlForwardingPluginMock.createSetupContract(),
        }
      );
      expect(setup).toHaveProperty('welcomeScreen');
      expect(setup.welcomeScreen).toHaveProperty('registerOnRendered');
      expect(setup.welcomeScreen).toHaveProperty('registerTelemetryNoticeRenderer');
    });
  });
});
