define(function (require) {
  var _ = require('lodash');
  require('ui/elastic_textarea');

  require('ui/modules').get('apps/settings')
  .directive('advancedRow', function (config, Notifier, Private) {
    return {
      restrict: 'A',
      replace: true,
      template: require('plugins/kibana/settings/sections/advanced/advanced_row.html'),
      scope: {
        conf: '=advancedRow',
        configs: '='
      },
      link: function ($scope) {
        var configDefaults = Private(require('ui/config/defaults'));
        var notify = new Notifier();
        var keyCodes = {
          ESC: 27
        };

        // To allow passing form validation state back
        $scope.forms = {};

        // setup loading flag, run async op, then clear loading and editting flag (just in case)
        var loading = function (conf, fn) {
          conf.loading = true;
          fn()
          .finally(function () {
            conf.loading = conf.editting = false;
          })
          .catch(notify.fatal);
        };

        $scope.maybeCancel = function ($event, conf) {
          if ($event.keyCode === keyCodes.ESC) {
            $scope.cancelEdit(conf);
          }
        };

        $scope.edit = function (conf) {
          conf.unsavedValue = conf.value == null ? conf.defVal : conf.value;
          $scope.configs.forEach(function (c) {
            c.editting = (c === conf);
          });
        };

        $scope.save = function (conf) {
          loading(conf, function () {
            if (conf.unsavedValue === conf.defVal) {
              return config.clear(conf.name);
            }

            return config.set(conf.name, conf.unsavedValue);
          });
        };

        $scope.cancelEdit = function (conf) {
          conf.editting = false;
        };

        $scope.clear = function (conf) {
          return loading(conf, function () {
            return config.clear(conf.name);
          });
        };

      }
    };
  });
});
