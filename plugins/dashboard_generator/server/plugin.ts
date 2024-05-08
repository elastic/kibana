import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { DashboardGeneratorPluginSetup, DashboardGeneratorPluginStart } from './types';
import { defineRoutes } from './routes';

export class DashboardGeneratorPlugin
  implements Plugin<DashboardGeneratorPluginSetup, DashboardGeneratorPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('dashboardGenerator: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, core);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('dashboardGenerator: Started');
    return {};
  }

  public stop() {}
}
