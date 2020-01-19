import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, AppMountContext } from '<%= relRoot %>/src/core/public';
import {
  <%= camelCaseName %>PublicPluginSetup,
  <%= camelCaseName %>PublicPluginStart,
} from './types';
import { PLUGIN_NAME } from '../common';

export class <%= camelCaseName %>PublicPlugin implements Plugin<<%= camelCaseName %>PublicPluginSetup, <%= camelCaseName %>PublicPluginStart> {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public setup(core: CoreSetup): <%= camelCaseName %>PublicPluginSetup {
    core.application.register({
      id: '<%= camelCase(name) %>',
      title: PLUGIN_NAME,
      async mount(context: AppMountContext, params: any) {
        const { renderApp } = await import('./components/app');
        return renderApp(context, params);
      },
    });

    return {
      getGreeting() {
        return 'Hello from Plugin A!';
      },
    };
  }

  public start(core: CoreStart): <%= camelCaseName %>PublicPluginStart {
    return {}
  }  

  public stop() {}
}