/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home, usageCollection }: VisTypeVegaPluginSetupDependencies) {
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
