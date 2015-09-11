define(function (require) {
  var _ = require('lodash');
  var getValType = require('plugins/kibana/settings/sections/advanced/lib/get_val_type');
  var getEditorType = require('plugins/kibana/settings/sections/advanced/lib/get_editor_type');


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

        var IMMUTABLE_CONFIG_VALS = ['buildNum'];

        function isTypeComplex(conf) {
          return !(conf.json || conf.array || conf.bool || conf.normal);
        }

        function notDefaultConfig(configName) {
          return !(configName in configDefaults);
        }

        function notImmutableConfig(configName) {
          return !_.contains(IMMUTABLE_CONFIG_VALS, configName);
        }

        function toEditableConfig(def, name, value) {
          var isCustom = !def;
          if (isCustom) def = {};

          var conf = {
            name,
            value,
            isCustom,
            defVal: def.value,
            type: getValType(def, value),
            description: def.description,
            options: def.options
          };

          var editor = getEditorType(conf);
          conf.json = editor === 'json';
          conf.select = editor === 'select';
          conf.bool = editor === 'boolean';
          conf.array = editor === 'array';
          conf.normal = editor === 'normal';
          conf.tooComplex = !editor;

          return conf;
        }

        function readConfigVals() {
          var configVals = config._vals();

          var customConfig = Object.keys(configVals)
          .filter(notDefaultConfig)
          .filter(notImmutableConfig)
          .map(name => toEditableConfig(false, name, configVals[name]));

          $scope.configs = _(configDefaults)
          .map((def, name) => toEditableConfig(def, name, configVals[name]))
          .concat(customConfig)
          .value();
        }

        readConfigVals();
        $rootScope.$on('change:config', readConfigVals);
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
