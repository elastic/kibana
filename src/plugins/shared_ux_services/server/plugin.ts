/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { SharedUXServicesPluginSetup, SharedUXServicesPluginStart } from './types';

export class SharedUXServicesPlugin
  implements Plugin<SharedUXServicesPluginSetup, SharedUXServicesPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('sharedUXServices: Setup');
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('sharedUXServices: Started');
    return {};
  }

  public stop() {}
}
