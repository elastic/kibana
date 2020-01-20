
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '<%= relRoot %>/src/core/server';

import {
  <%= upperCamelCaseName %>PluginSetup,
  <%= upperCamelCaseName %>PluginStart,
} from './types';

export class <%= upperCamelCaseName %>ServerPlugin implements Plugin<<%= upperCamelCaseName %>PluginSetup, <%= upperCamelCaseName %>PluginStart> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get(
      {
        path: '/api/<%= snakeCase(name) %>/example',
        validate: false,
      },
      async (context, request, response) => {
        return response.ok({
          body: {
            time: (new Date()).toISOString(),
          }
        });
      }
    );
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

export { <%= upperCamelCaseName %>ServerPlugin as Plugin };
