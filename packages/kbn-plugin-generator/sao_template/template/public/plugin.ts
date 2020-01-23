import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from '<%= relRoot %>/src/core/public';
import { <%= upperCamelCaseName %>PublicPluginSetup, <%= upperCamelCaseName %>PublicPluginStart, AppPluginDependencies } from './types';
import { PLUGIN_NAME } from '../common';

export class <%= upperCamelCaseName %>PublicPlugin
  implements Plugin<<%= upperCamelCaseName %>PublicPluginSetup, <%= upperCamelCaseName %>PublicPluginStart> {
  
  public setup(core: CoreSetup): <%= upperCamelCaseName %>PublicPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: '<%= camelCase(name) %>',
      title: PLUGIN_NAME,
      async mount(params) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
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
    return {};
  }

  public stop() {}
}
