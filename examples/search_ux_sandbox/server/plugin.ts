import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { SearchUxSandboxPluginSetup, SearchUxSandboxPluginStart } from './types';
import { defineRoutes } from './routes';

export class SearchUxSandboxPlugin
  implements Plugin<SearchUxSandboxPluginSetup, SearchUxSandboxPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('searchUxSandbox: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('searchUxSandbox: Started');
    return {};
  }

  public stop() {}
}
