define(function (require) {
  var _ = require('lodash');
  var configDefaults = require('components/config/defaults');
  var getValType = require('plugins/settings/sections/advanced/lib/get_val_type');


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

        var NAMED_EDITORS = ['json', 'array', 'boolean'];
        var NORMAL_EDITOR = ['number', 'string', 'null', 'undefined'];

        function getEditorType(conf) {
          if (_.contains(NAMED_EDITORS, conf.type)) return conf.type;
          if (_.contains(NORMAL_EDITOR, conf.type)) return 'normal';
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
              type: getValType(def, val),
              description: def.description,
              value: val,
            };

            var editor = getEditorType(conf);
            conf.json = editor === 'json';
            conf.bool = editor === 'boolean';
            conf.array = editor === 'array';
            conf.normal = editor === 'normal';
            conf.tooComplex = !editor;

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