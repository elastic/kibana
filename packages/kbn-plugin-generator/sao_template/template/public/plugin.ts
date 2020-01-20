import { CoreSetup, CoreStart, Plugin } from '<%= relRoot %>/src/core/public';
import {
  <%= upperCamelCaseName %>PublicPluginSetup,
  <%= upperCamelCaseName %>PublicPluginStart,
} from './types';
import { i18n } from '@kbn/i18n';
import { PLUGIN_NAME } from '../common';

export class <%= upperCamelCaseName %>PublicPlugin implements Plugin<<%= upperCamelCaseName %>PublicPluginSetup, <%= upperCamelCaseName %>PublicPluginStart> {
  public setup(core: CoreSetup): <%= upperCamelCaseName %>PublicPluginSetup {
    core.application.register({
      id: '<%= camelCase(name) %>',
      title: PLUGIN_NAME,
      async mount(params) {
        // Load application bundle
        const { renderApp } = await import('./components/app');
        // Get start services
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      }
    });

    // Return any methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('<%= camelCase(name) %>.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: { 
            name: PLUGIN_NAME,
           },
        });
      },
    };
  }

  public start(core: CoreStart): <%= upperCamelCaseName %>PublicPluginStart {
    return {}
  }  

  public stop() {}
}
