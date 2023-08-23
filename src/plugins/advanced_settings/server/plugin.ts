/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { capabilitiesProvider } from './capabilities_provider';
import { ALL_ALLOWLIST_SETTINGS } from './settings_allowlist';

export class AdvancedSettingsServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('advancedSettings: Setup');

    core.capabilities.registerProvider(capabilitiesProvider);

    core.uiSettings.setAllowlist(ALL_ALLOWLIST_SETTINGS);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('advancedSettings: Started');
    return {};
  }

  public stop() {}
}
