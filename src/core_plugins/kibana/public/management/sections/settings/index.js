import _ from 'lodash';
import { toEditableConfig } from 'plugins/kibana/management/sections/settings/lib/to_editable_config';
import 'plugins/kibana/management/sections/settings/advanced_row';
import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from 'plugins/kibana/management/sections/settings/index.html';

uiRoutes
.when('/management/kibana/settings', {
  template: indexTemplate
});

uiModules.get('apps/management')
.directive('kbnManagementAdvanced', function (config) {
  return {
    restrict: 'E',
    link: function ($scope) {
      // react to changes of the config values
      config.watchAll(changed, $scope);

      // initial config setup
      changed();

      function changed() {
        const all = config.getAll();
        const editable = _(all)
          .map((def, name) => toEditableConfig({
            def,
            name,
            value: def.userValue,
            isCustom: config.isCustom(name)
          }))
          .value();
        const writable = _.reject(editable, 'readonly');
        $scope.configs = writable;
      }
    }
  };
});

management.getSection('kibana').register('settings', {
  display: 'Advanced Settings',
  order: 20,
  url: '#/management/kibana/settings'
});
