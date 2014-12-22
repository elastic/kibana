define(function (require) {
  var _ = require('lodash');
  var configDefaults = require('components/config/defaults');

  require('plugins/settings/sections/advanced/advanced_row');

  require('routes')
  .when('/settings/advanced', {
    template: require('text!plugins/settings/sections/advanced/index.html')
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsAdvanced', function (config, Notifier, Private) {
    return {
      restrict: 'E',
      link: function ($scope) {
        var notify = new Notifier();
        var configVals = config._vals();
        var keyCodes = {
          ESC: 27
        };

        // determine if a value is too complex to be edditted (at this time)
        var tooComplex = function (conf) {
          // get the type of the current value or the default
          switch (conf.type) {
          case 'string':
          case 'number':
          case 'null':
          case 'undefined':
            conf.normal = true;
            break;
          case 'json':
            conf.json = true;
            break;
          default:
            if (_.isArray(config.get(conf.name))) {
              conf.array = true;
            } else if (typeof config.get(conf.name) === 'boolean') {
              conf.bool = true;
            } else {
              conf.tooComplex = true;
            }
          }
        };

        $scope.configs = _.map(configDefaults, function (def, name) {
          var conf = {
            name: name,
            defVal: def.value,
            type: (def.type ||  typeof config.get(name)),
            description: def.description,
            value: configVals[name]
          };

          tooComplex(conf);

          $scope.$on('change:config.' + name, function () {
            configVals = config._vals();
            conf.value = configVals[name];
            tooComplex(conf);
          });

          return conf;
        });
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