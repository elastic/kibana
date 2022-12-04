import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ContentPluginSetup, ContentPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME } from '../common';
import { ContentRegistry } from './service/registry/content_registry';
import { ContentCache } from './service/cache/content_cache';
import { ContentItemDetails } from './service/registry/types';

export class ContentPlugin implements Plugin<ContentPluginSetup, ContentPluginStart> {
  public setup(core: CoreSetup): ContentPluginSetup {
    const contentRegistry = new ContentRegistry();
    const contentCache = new ContentCache(contentRegistry);

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
          const [coreStart] = await core.getStartServices();
          const so = coreStart.savedObjects.client;
          const res = await so.get('dashboard', id);
          const details: ContentItemDetails = {
            id: res.id,
            fields: {
              title: res.attributes.title,
              description: res.attributes.description,
            },
            data: res.attributes,
          };
          return details;
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
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params, contentRegistry, contentCache);
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
