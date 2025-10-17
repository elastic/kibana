/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerRoutes } from './routes';

// No setup contract needed for this plugin

export class CPSServerPlugin implements Plugin<{}> {
  private readonly initContext: PluginInitializerContext;
  private readonly isServerless: boolean;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = { ...initContext };
    this.isServerless = initContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(core: CoreSetup, plugins: {}) {
    const { initContext } = this;

    // Register route only for serverless
    if (this.isServerless) {
      registerRoutes(core, initContext);
    }

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
