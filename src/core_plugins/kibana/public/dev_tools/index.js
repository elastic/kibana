import uiRoutes from 'ui/routes';
import 'plugins/kibana/dev_tools/directives/dev_tools_app';

uiRoutes
.when('/dev_tools', {
  template: '<kbn-dev-tools-app></kbn-dev-tools-app>'
});
