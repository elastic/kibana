import { uiModules } from 'ui/modules';
import './matching_indices_list.less';
import template from './matching_indices_list.html';

const module = uiModules.get('apps/management');

module.directive('matchingIndicesList', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    transclude: true,
    scope: {
      indices: '=',
      isLoading: '=',
    },
    link: function () {

    },
  };
});
