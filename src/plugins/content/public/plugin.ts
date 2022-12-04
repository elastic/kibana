import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ContentPluginSetup, ContentPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME } from '../common';
import { ContentRegistry } from './service/registry/content_registry';

export class ContentPlugin implements Plugin<ContentPluginSetup, ContentPluginStart> {
  public setup(core: CoreSetup): ContentPluginSetup {
    const contentRegistry = new ContentRegistry();

    contentRegistry.registerType({
      id: 'dashboard',
      name: i18n.translate('content.dashboard.name', {
        defaultMessage: 'Dashboard',
      }),
      description: i18n.translate('content.dashboard.description', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
      operations: {
        read: async (id: string) => {
          const { data } = await core.http.get(`/api/content/dashboard/${id}`);
          return data;
        }
      },
    });


    // Register an application into the side menu
    core.application.register({
      id: 'content',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params, contentRegistry);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('content.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): ContentPluginStart {
    return {};
  }

  public stop() {}
}
