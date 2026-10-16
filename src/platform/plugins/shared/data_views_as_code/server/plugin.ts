/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type {
  DataViewsAsCodeServerPluginSetupDependencies,
  DataViewsAsCodeServerPluginStartDependencies,
} from './types';

export class DataViewsAsCodeServerPlugin
  implements
    Plugin<
      void,
      void,
      DataViewsAsCodeServerPluginSetupDependencies,
      DataViewsAsCodeServerPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<DataViewsAsCodeServerPluginStartDependencies, void>,
    deps: DataViewsAsCodeServerPluginSetupDependencies
  ) {
    registerRoutes({
      http: core.http,
      usageCounter: deps.usageCollection?.createUsageCounter('data_views_as_code_api'),
      logger: this.logger,
      getStartServices: core.getStartServices,
    });
  }

  public start() {}

  public stop() {}
}

export { DataViewsAsCodeServerPlugin as Plugin };
