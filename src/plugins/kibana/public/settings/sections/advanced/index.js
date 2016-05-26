import _ from 'lodash';
import registry from '../../../../../../ui/public/registry/settings_sections';
import toEditableConfig from 'plugins/kibana/settings/sections/advanced/lib/to_editable_config';
import 'plugins/kibana/settings/sections/advanced/advanced_row';
import uiRoutes from '../../../../../../ui/public/routes';
import uiModules from '../../../../../../ui/public/modules';
import indexTemplate from 'plugins/kibana/settings/sections/advanced/index.html';

uiRoutes
.when('/settings/advanced', {
  template: indexTemplate
});

uiModules.get('apps/settings')
.directive('kbnSettingsAdvanced', function (config, Notifier, Private, $rootScope) {
  return {
    restrict: 'E',
    link: function ($scope) {
      // react to changes of the config values
      config.watchAll(changed, $scope);

      // initial config setup
      changed();

      function changed(values) {
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

registry.register(_.constant({
  order: 2,
  name: 'advanced',
  display: 'Advanced',
  url: '#/settings/advanced'
}));
