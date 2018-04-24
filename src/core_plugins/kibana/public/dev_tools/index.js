import uiRoutes from 'ui/routes';
import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import './directives/dev_tools_app';

uiRoutes
  .when('/dev_tools', {
    resolve: {
      redirect(Private, kbnUrl) {
        const items = Private(DevToolsRegistryProvider).inOrder;
        kbnUrl.redirect(items[0].url.substring(1));
      }
    }
  });

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'console',
    title: 'Console',
    description: 'Skip cURL and use this JSON interface to work with your data directly.',
    icon: '/plugins/kibana/assets/app_console.svg',
    path: '/app/kibana#/dev_tools/console',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
