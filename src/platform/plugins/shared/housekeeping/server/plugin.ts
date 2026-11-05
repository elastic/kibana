/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { HOUSEKEEPING_APP_ID } from '../common';
import { HousekeepingRegistry } from './registry';
import { registerRoutes } from './routes';
import type { HousekeepingServerSetup } from './types';

export class HousekeepingServerPlugin implements Plugin<HousekeepingServerSetup> {
  private readonly logger: Logger;
  private readonly isServerless: boolean;
  private readonly registry = new HousekeepingRegistry();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup,
    { features }: { features?: FeaturesPluginSetup }
  ): HousekeepingServerSetup {
    // Like Upgrade Assistant, only for cluster administrators.
    features?.registerElasticsearchFeature({
      id: HOUSEKEEPING_APP_ID,
      management: { stack: [HOUSEKEEPING_APP_ID] },
      privileges: [{ requiredClusterPrivileges: ['manage'], ui: [] }],
    });

    registerRoutes({
      router: core.http.createRouter(),
      registry: this.registry,
      logger: this.logger,
      isServerless: this.isServerless,
    });

    return {
      registerResourceProvider: (provider) => this.registry.registerResourceProvider(provider),
      registerCheck: (check) => this.registry.registerCheck(check),
    };
  }

  public start() {}

  public stop() {}
}
