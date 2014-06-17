define(function (require) {
  var _ = require('lodash');
  var configDefaults = require('components/config/defaults');

  require('routes')
  .when('/settings/advanced', {
    template: require('text!apps/settings/sections/advanced/index.html')
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsAdvanced', function (config, Notifier, Private) {
    return {
      restrict: 'E',
      link: function ($scope) {
        var notify = new Notifier();
        var configVals = config._vals();

        // determine if a value is too complex to be edditted (at this time)
        var tooComplex = function (conf) {
          // get the type of the current value or the default
          switch (typeof config.get(conf.name)) {
          case 'string':
          case 'number':
          case 'null':
          case 'undefined':
            conf.tooComplex = false;
            break;
          default:
            conf.tooComplex = true;
          }
        };

        // setup loading flag, run async op, then clear loading and editting flag (just in case)
        var loading = function (conf, fn) {
          conf.loading = true;
          fn()
          .finally(function () {
            conf.loading = conf.editting = false;
          })
          .catch(notify.fatal);
        };

        $scope.configs = _.map(configDefaults, function (defVal, name) {
          var conf = {
            name: name,
            defVal: defVal,
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

        $scope.maybeCancel = function ($event, conf) {
          if ($event.keyCode === 27) {
            conf.editting = false;
          }
        };

        $scope.edit = function (conf) {
          console.log(conf);
          conf.unsavedValue = conf.value;
          $scope.configs.forEach(function (c) {
            c.editting = (c === conf);
          });
        };

        $scope.save = function (conf) {
          loading(conf, function () {
            return config.set(conf.name, conf.unsavedValue);
          });
        };

        $scope.clear = function (conf) {
          return loading(conf, function () {
            return config.clear(conf.name);
          });
        };
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