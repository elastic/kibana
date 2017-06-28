import { uiModules } from 'ui/modules';
import template from './matching_indices_list.html';

const module = uiModules.get('apps/management');

module.directive('matchingIndicesList', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      indices: '=',
      templateIndexPatterns: '=',
    },
    link: function () {

    },
  };
});
