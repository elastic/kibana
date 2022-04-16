/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerRoutesMock } from './plugin.test.mocks';
import { SavedObjectsManagementPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';

describe('SavedObjectsManagementPlugin', () => {
  let plugin: SavedObjectsManagementPlugin;

  beforeEach(() => {
    plugin = new SavedObjectsManagementPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#setup', () => {
    it('registers the routes', async () => {
      const coreSetup = coreMock.createSetup();

      await plugin.setup(coreSetup);

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          http: coreSetup.http,
        })
      );
    });
  });
});
