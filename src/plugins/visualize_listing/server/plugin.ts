import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import { VisualizeListingPluginSetup, VisualizeListingPluginStart } from './types';
import { defineRoutes } from './routes';

export class VisualizeListingPlugin
  implements Plugin<VisualizeListingPluginSetup, VisualizeListingPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('visualizeListing: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('visualizeListing: Started');
    return {};
  }

  public stop() {}
}
