/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CPSPluginSetup, CPSPluginStart, CPSConfigType } from './types';
import { CPSManager } from './services/cps_manager';

export class CpsPlugin implements Plugin<CPSPluginSetup, CPSPluginStart> {
  private readonly initializerContext: PluginInitializerContext<CPSConfigType>;
  private cpsManager?: CPSManager;

  constructor(initializerContext: PluginInitializerContext<CPSConfigType>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup): CPSPluginSetup {
    const { cpsEnabled } = this.initializerContext.config.get();

    return {
      cpsEnabled,
    };
  }

  public start(core: CoreStart): CPSPluginStart {
    const { cpsEnabled } = this.initializerContext.config.get();
    // Only initialize cpsManager in serverless environments when CPS is enabled
    if (cpsEnabled) {
      this.cpsManager = new CPSManager(core.http);
    }

    return {
      cpsManager: this.cpsManager,
    };
  }

  public stop() {}
}
