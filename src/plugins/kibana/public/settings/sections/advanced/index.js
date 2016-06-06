define(function (require) {
  const _ = require('lodash');
  const registry = require('ui/registry/settings_sections');
  const toEditableConfig = require('plugins/kibana/settings/sections/advanced/lib/to_editable_config');

  require('plugins/kibana/settings/sections/advanced/advanced_row');

  require('ui/routes')
  .when('/settings/advanced', {
    template: require('plugins/kibana/settings/sections/advanced/index.html')
  });

  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsAdvanced', function (config, Notifier, Private, $rootScope) {
    return {
      restrict: 'E',
      link: function ($scope) {
        const configDefaults = Private(require('ui/config/defaults'));
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
});
