import uiRoutes from 'ui/routes';
import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';
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
