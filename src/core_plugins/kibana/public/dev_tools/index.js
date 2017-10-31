import uiRoutes from 'ui/routes';
import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';
import { KbnDirectoryRegistryProvider, DirectoryCategory } from 'ui/registry/kbn_directory';
import 'plugins/kibana/dev_tools/directives/dev_tools_app';

uiRoutes
.when('/dev_tools', {
  resolve: {
    redirect(Private, kbnUrl) {
      const items = Private(DevToolsRegistryProvider).inOrder;
      kbnUrl.redirect(items[0].url.substring(1));
    }
  }
});

KbnDirectoryRegistryProvider.register(() => {
  return {
    id: 'console',
    title: 'Console',
    description: 'Manipulate your ES data directly with console.',
    icon: '/plugins/kibana/assets/app_devtools.svg',
    path: '/app/kibana#/dev_tools/console',
    showOnHomePage: true,
    category: DirectoryCategory.ADMIN
  };
});
