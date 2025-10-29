/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CPSPluginSetup, CPSPluginStart } from './types';
import { CpsManager } from './services/cps_manager';

export class CpsPlugin implements Plugin<CPSPluginSetup, CPSPluginStart> {
  private readonly isServerless: boolean;
  private cpsManager?: CpsManager;

  constructor(initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(core: CoreSetup): CPSPluginSetup {
    return {};
  }

  public start(core: CoreStart): CPSPluginStart {
    console.log('CPS Plugin started', this.isServerless);
    // Only initialize cpsManager in serverless environments
    if (this.isServerless) {
      this.cpsManager = new CpsManager(core.http);
    }

    return {
      cpsManager: this.cpsManager,
    };
  }

  public stop() {}
}
