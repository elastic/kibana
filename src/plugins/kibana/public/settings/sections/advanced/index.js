define(function (require) {
  var _ = require('lodash');
  var toEditableConfig = require('plugins/kibana/settings/sections/advanced/lib/to_editable_config');


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
        var configDefaults = Private(require('ui/config/defaults'));
        var keyCodes = {
          ESC: 27
        };

        function isTypeComplex(conf) {
          return !(conf.json || conf.array || conf.bool || conf.normal);
        }

        function notDefaultConfig(configName) {
          return !(configName in configDefaults);
        }

        function readConfigVals() {
          var configVals = config._vals();

          var customConfig = Object.keys(configVals)
          .filter(notDefaultConfig)
          .map(name => toEditableConfig(false, name, configVals[name]));

          $scope.configs = _(configDefaults)
          .map((def, name) => toEditableConfig(def, name, configVals[name]))
          .reject('readonly')
          .concat(customConfig)
          .value();
        }

        // react to changes of the config values
        var unhook = $rootScope.$on('change:config', readConfigVals);
        $scope.$on('$destroy', unhook);

        // initial config setup
        readConfigVals();
      }
    };
  });

  return {
    order: 2,
    name: 'advanced',
    display: 'Advanced',
    url: '#/settings/advanced'
  };
});
