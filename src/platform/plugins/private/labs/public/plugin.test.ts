/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { LabsPlugin } from './plugin';
import { HELLO_WORLD_APP_ID, PLUGIN_ID, PLUGIN_PATH } from '../common';

describe('LabsPlugin', () => {
  it('registers the Labs marketplace in the left nav', () => {
    const plugin = new LabsPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PLUGIN_ID,
        appRoute: PLUGIN_PATH,
        title: 'Labs',
        visibleIn: ['globalSearch', 'home', 'sideNav'],
      })
    );
  });

  it('registers the hello world lab application', () => {
    const plugin = new LabsPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: HELLO_WORLD_APP_ID,
        visibleIn: ['globalSearch', 'sideNav'],
      })
    );
  });
});
