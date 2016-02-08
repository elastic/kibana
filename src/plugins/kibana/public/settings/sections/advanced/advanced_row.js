import _ from 'lodash';
import 'ui/elastic_textarea';
import ConfigDefaultsProvider from 'ui/config/defaults';
import uiModules from 'ui/modules';
import advancedRowTemplate from 'plugins/kibana/settings/sections/advanced/advanced_row.html';

uiModules.get('apps/settings')
.directive('advancedRow', function (config, Notifier, Private) {
  return {
    restrict: 'A',
    replace: true,
    template: advancedRowTemplate,
    scope: {
      conf: '=advancedRow',
      configs: '='
    },
    link: function ($scope) {
      const configDefaults = Private(ConfigDefaultsProvider);
      const notify = new Notifier();
      const keyCodes = {
        ESC: 27
      };

      // To allow passing form validation state back
      $scope.forms = {};

      // setup loading flag, run async op, then clear loading and editing flag (just in case)
      const loading = function (conf, fn) {
        conf.loading = true;
        fn()
        .finally(function () {
          conf.loading = conf.editing = false;
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
          c.editing = (c === conf);
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
        conf.editing = false;
      };

      $scope.clear = function (conf) {
        return loading(conf, function () {
          return config.clear(conf.name);
        });
      };

    }
  };
});
