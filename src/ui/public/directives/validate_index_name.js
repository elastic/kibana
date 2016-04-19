import _ from 'lodash';
import uiModules from 'ui/modules';
// See https://github.com/elastic/elasticsearch/issues/6736

uiModules
  .get('kibana')
  .directive('validateIndexName', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        let illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|', ' ', ','];
        let isValid = function (input) {
          if (input == null || input === '' || input === '.' || input === '..') return false;

          let match = _.find(illegalCharacters, function (character) {
            return input.indexOf(character) >= 0;
          });
          return !match;
        };

        // From User
        ngModel.$parsers.unshift(function (value) {
          let valid = isValid(value);
          ngModel.$setValidity('indexNameInput', valid);
          return valid ? value : undefined;
        });

        // To user
        ngModel.$formatters.unshift(function (value) {
          ngModel.$setValidity('indexNameInput', isValid(value));
          return value;
        });

      }
    };
  });
