/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { capabilitiesProvider } from './capabilities_provider';
import { AdvancedSettingsConfig } from './config';

export class AdvancedSettingsServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;
  private readonly config: AdvancedSettingsConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('advancedSettings: Setup');

    core.capabilities.registerProvider(() => capabilitiesProvider(this.config));

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('advancedSettings: Started');
    return {};
  }

  public stop() {}
}
