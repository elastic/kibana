/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'kibana/server';
import { capabilitiesProvider } from './capabilities_provider';

export class ManagementServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('management: Setup');

    core.capabilities.registerProvider(capabilitiesProvider);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('management: Started');
    return {};
  }

  public stop() {}
}
