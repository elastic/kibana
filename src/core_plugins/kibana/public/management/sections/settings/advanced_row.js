import 'ui/elastic_textarea';
import 'ui/filters/markdown';
import { uiModules } from 'ui/modules';
import { fatalError } from 'ui/notify';
import { keyCodes } from '@elastic/eui';
import advancedRowTemplate from './advanced_row.html';

uiModules.get('apps/management')
  .directive('advancedRow', function (config) {
    return {
      restrict: 'A',
      replace: true,
      template: advancedRowTemplate,
      scope: {
        conf: '=advancedRow',
        configs: '='
      },
      link: function ($scope) {
        // To allow passing form validation state back
        $scope.forms = {};

        // setup loading flag, run async op, then clear loading and editing flag (just in case)
        const loading = function (conf, fn) {
          conf.loading = true;
          fn()
            .then(function () {
              conf.loading = conf.editing = false;
            })
            .catch(fatalError);
        };

        $scope.maybeCancel = function ($event, conf) {
          if ($event.keyCode === keyCodes.ESCAPE) {
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
          // an empty JSON is valid as per the validateJson directive.
          // set the value to empty JSON in this case so that its parsing upon retrieving the setting does not fail.
          if (conf.type === 'json' && conf.unsavedValue === '') {
            conf.unsavedValue = '{}';
          }

          loading(conf, function () {
            if (conf.unsavedValue === conf.defVal) {
              return config.remove(conf.name);
            }

            return config.set(conf.name, conf.unsavedValue);
          });
        };

        $scope.cancelEdit = function (conf) {
          conf.editing = false;
        };

        $scope.clear = function (conf) {
          return loading(conf, function () {
            return config.remove(conf.name);
          });
        };

        $scope.isDefaultValue = (conf) => {
        // conf.isCustom = custom setting, provided by user, so there is no notion of
        // having a default or non-default value for it
          return conf.isCustom
          || conf.value === undefined
          || conf.value === ''
          || String(conf.value) === String(conf.defVal);
        };
      }
    };
  });
