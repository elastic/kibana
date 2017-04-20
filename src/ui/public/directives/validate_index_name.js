import _ from 'lodash';
import { uiModules } from 'ui/modules';
// See https://github.com/elastic/elasticsearch/issues/6736

uiModules
  .get('kibana')
  .directive('validateIndexName', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, elem, attr, ngModel) {
        const illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|', ' ', ','];
        const allowWildcard = !_.isUndefined(attr.allowWildcard) && attr.allowWildcard !== 'false';
        if (!allowWildcard) {
          illegalCharacters.push('*');
        }

        const isValid = function (input) {
          if (input == null || input === '' || input === '.' || input === '..') return false;

          const match = _.find(illegalCharacters, function (character) {
            return input.indexOf(character) >= 0;
          });
          return !match;
        };

        ngModel.$validators.indexNameInput = function (modelValue, viewValue) {
          return isValid(viewValue);
        };
      }
    };
  });
