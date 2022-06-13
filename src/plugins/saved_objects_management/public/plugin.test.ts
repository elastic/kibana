/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { SavedObjectsManagementPlugin } from './plugin';

describe('SavedObjectsManagementPlugin', () => {
  let plugin: SavedObjectsManagementPlugin;

  beforeEach(() => {
    plugin = new SavedObjectsManagementPlugin();
  });

  describe('#setup', () => {
    it('registers the saved_objects feature to the home plugin', async () => {
      const coreSetup = coreMock.createSetup({
        pluginStartDeps: {
          dataViews: dataViewPluginMocks.createStartContract(),
          data: dataPluginMock.createStartContract(),
        },
      });
      const homeSetup = homePluginMock.createSetupContract();
      const managementSetup = managementPluginMock.createSetupContract();

      await plugin.setup(coreSetup, { home: homeSetup, management: managementSetup });

      expect(homeSetup.featureCatalogue.register).toHaveBeenCalledTimes(1);
      expect(homeSetup.featureCatalogue.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'saved_objects',
        })
      );
    });
  });
});
