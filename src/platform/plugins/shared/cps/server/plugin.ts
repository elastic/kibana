/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { registerRoutes } from './routes';
import type { CPSConfig } from './config';
import type { CPSServerSetup } from './types';

export class CPSServerPlugin implements Plugin<CPSServerSetup> {
  private readonly initContext: PluginInitializerContext;
  private readonly isServerless: boolean;
  private readonly config$: Observable<CPSConfig>;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = { ...initContext };
    this.isServerless = initContext.env.packageInfo.buildFlavor === 'serverless';
    this.config$ = initContext.config.create();
  }

  public setup(core: CoreSetup) {
    void this.setCpsFeatureFlagAsync(core);
    const { initContext, config$ } = this;

    // Register route only for serverless
    if (this.isServerless) {
      registerRoutes(core, initContext);
    }

    return {
      getCpsEnabled: async () => {
        const { cpsEnabled } = await firstValueFrom(config$);
        return cpsEnabled;
      },
    };
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}

  private async setCpsFeatureFlagAsync(core: CoreSetup) {
    const config = await firstValueFrom(this.config$);
    core.elasticsearch.setCpsFeatureFlag(config.cpsEnabled);
  }
}
