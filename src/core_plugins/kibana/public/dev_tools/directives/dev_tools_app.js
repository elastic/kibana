import { uiModules } from 'ui/modules';
import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';
import template from '../partials/dev_tools_app.html';
import '../styles/dev_tools_app.less';
import 'ui/kbn_top_nav';

uiModules
  .get('apps/dev_tools')
  .directive('kbnDevToolsApp', function (Private, $location) {
    const devToolsRegistry = Private(DevToolsRegistryProvider);

    return {
      restrict: 'E',
      replace: true,
      template,
      transclude: true,
      scope: {
        topNavConfig: '='
      },
      bindToController: true,
      controllerAs: 'kbnDevToolsApp',
      controller() {
        this.devTools = devToolsRegistry.inOrder;
        this.currentPath = `#${$location.path()}`;

        this.onClick = (item, $event) => {
          if (item.disabled) {
            $event.preventDefault();
          }
        };
      }
    };
  });
