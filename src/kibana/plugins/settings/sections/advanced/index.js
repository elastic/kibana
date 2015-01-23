define(function (require) {
  var _ = require('lodash');
  var configDefaults = require('components/config/defaults');

  require('plugins/settings/sections/advanced/advanced_row');

  require('routes')
  .when('/settings/advanced', {
    template: require('text!plugins/settings/sections/advanced/index.html')
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsAdvanced', function (config, Notifier, Private, $rootScope) {
    return {
      restrict: 'E',
      link: function ($scope) {
        var keyCodes = {
          ESC: 27
        };

        function getEditorType(conf) {
          if (_.contains('number string null undefined', conf.type)) return 'normal';
          if (_.contains('json array boolean', conf.type)) return conf.type;
        }

        function isTypeComplex(conf) {
          return !(conf.json || conf.array || conf.bool || conf.normal);
        }

        function readConfigVals() {
          var configVals = config._vals();

          $scope.configs = _.map(configDefaults, function (def, name) {
            var val = configVals[name];
            var conf = {
              name: name,
              defVal: def.value,
              type: (def.type || _.isArray(val) || typeof val),
              description: def.description,
              value: val,
            };

            var editorType  = getEditorType(conf);
            conf.json       = editorType === 'json';
            conf.bool       = editorType === 'bool';
            conf.array      = editorType === 'array';
            conf.normal     = editorType === 'normal';
            conf.tooComplex = !editorType;

            return conf;
          });
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