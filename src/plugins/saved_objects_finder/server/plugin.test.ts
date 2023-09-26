/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { SavedObjectsServerPlugin } from './plugin';
import { uiSettings } from './ui_settings';

describe('SavedObjectsPlugin', () => {
  let plugin: SavedObjectsServerPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    plugin = new SavedObjectsServerPlugin();
  });

  describe('#setup', () => {
    it('calls `registerSettings` with the correct parameters', () => {
      plugin.setup(coreSetup);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith(uiSettings);
    });
  });
});
