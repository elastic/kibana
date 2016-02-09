import _ from 'lodash';
import registry from 'ui/registry/settings_sections';
import toEditableConfig from 'plugins/kibana/settings/sections/advanced/lib/to_editable_config';
import 'plugins/kibana/settings/sections/advanced/advanced_row';
import ConfigDefaultsProvider from 'ui/config/defaults';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
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
      const configDefaults = Private(ConfigDefaultsProvider);
      const keyCodes = {
        ESC: 27
      };

      function isTypeComplex(conf) {
        return !(conf.json || conf.array || conf.bool || conf.normal);
      }

      function notDefaultConfig(configName) {
        return !(configName in configDefaults);
      }

      function readConfigVals() {
        const configVals = config._vals();

        const customConfig = Object.keys(configVals)
        .filter(notDefaultConfig)
        .map(name => toEditableConfig(false, name, configVals[name]));

        $scope.configs = _(configDefaults)
        .map((def, name) => toEditableConfig(def, name, configVals[name]))
        .reject('readonly')
        .concat(customConfig)
        .value();
      }

      // react to changes of the config values
      const unhook = $rootScope.$on('change:config', readConfigVals);
      $scope.$on('$destroy', unhook);

      // initial config setup
      readConfigVals();
    }
  };
});

registry.register(_.constant({
  order: 2,
  name: 'advanced',
  display: 'Advanced',
  url: '#/settings/advanced'
}));
