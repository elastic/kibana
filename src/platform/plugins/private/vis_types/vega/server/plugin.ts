/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';
import { registerSandboxCspSpikeRoutes } from './sandbox_csp_spike';
import { registerSandboxRoute } from './sandbox_route';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private readonly isDevMode: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.isDevMode = initializerContext.env.mode.dev;
  }

  public setup(core: CoreSetup, { home, usageCollection }: VisTypeVegaPluginSetupDependencies) {
    registerSandboxRoute(core);

    if (this.isDevMode) {
      registerSandboxCspSpikeRoutes(core);
    }

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
