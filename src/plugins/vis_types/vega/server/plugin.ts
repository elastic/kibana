/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { registerVegaUsageCollector } from './usage_collector';
import {
  ConfigObservable,
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private readonly config: ConfigObservable;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.legacy.globalConfig$;
  }

  public setup(core: CoreSetup, { home, usageCollection }: VisTypeVegaPluginSetupDependencies) {
    if (usageCollection) {
      registerVegaUsageCollector(usageCollection, this.config, { home });
    }
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
