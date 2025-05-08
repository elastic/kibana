import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { CacheUsagePluginSetup, CacheUsagePluginStart } from './types';
import { defineRoutes } from './routes';

export class CacheUsagePlugin implements Plugin<CacheUsagePluginSetup, CacheUsagePluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('cacheUsage: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, core.cache);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('cacheUsage: Started');
    return {};
  }

  public stop() {}
}
