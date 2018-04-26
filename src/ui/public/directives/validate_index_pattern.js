import _ from 'lodash';
import { uiModules } from '../modules';
// See https://github.com/elastic/elasticsearch/issues/6736

uiModules
  .get('kibana')
  .directive('validateIndexPattern', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, elem, attr, ngModel) {
        const illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|', ' '];

        const allowWildcard =
          !_.isUndefined(attr.validateIndexPatternAllowWildcard)
          && attr.validateIndexPatternAllowWildcard !== 'false';

        if (!allowWildcard) {
          illegalCharacters.push('*');
        }

        const isValid = function (input) {
          if (input == null || input === '') return !attr.required === true;
          if (input === '.' || input === '..') return false;

          const match = _.find(illegalCharacters, function (character) {
            return input.indexOf(character) >= 0;
          });

          return !match;
        };

        ngModel.$validators.indexPattern = function (modelValue, viewValue) {
          return isValid(viewValue);
        };
      }
    };
  });
