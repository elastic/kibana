/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { routeRepository } from './routes';

export type MetricsExperiencePluginSetup = ReturnType<MetricsExperiencePlugin['setup']>;
export type MetricsExperiencePluginStart = ReturnType<MetricsExperiencePlugin['start']>;

export class MetricsExperiencePlugin
  implements Plugin<MetricsExperiencePluginSetup, MetricsExperiencePluginStart>
{
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup) {
    registerRoutes({
      core,
      logger: this.logger,
      repository: routeRepository,
      dependencies: {},
      runDevModeChecks: true,
    });
  }

  public start(_core: CoreStart) {}

  public stop() {}
}
