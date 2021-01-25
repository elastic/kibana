/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { uiSettings } from './ui_settings';
import { capabilitiesProvider } from './capabilities_provider';
import { searchSavedObjectType } from './saved_objects';

export class DiscoverServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.capabilities.registerProvider(capabilitiesProvider);
    core.uiSettings.register(uiSettings);
    core.savedObjects.registerType(searchSavedObjectType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
