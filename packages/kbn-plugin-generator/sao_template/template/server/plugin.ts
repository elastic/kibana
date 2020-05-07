import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '<%= relRoot %>/src/core/server';

import { <%= upperCamelCaseName %>PluginSetup, <%= upperCamelCaseName %>PluginStart } from './types';
import { defineRoutes } from './routes';

export class <%= upperCamelCaseName %>Plugin
  implements Plugin<<%= upperCamelCaseName %>PluginSetup, <%= upperCamelCaseName %>PluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {  
    this.logger = initializerContext.logger.get(); 
  }
  
  public setup(core: CoreSetup) {
    this.logger.debug('<%= name %>: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('<%= name %>: Started');
    return {};
  }

  public stop() {}
}
