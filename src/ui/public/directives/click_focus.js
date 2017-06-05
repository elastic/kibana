import _ from 'lodash';
import $ from 'jquery';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('clickFocus', function () {
  return {
    scope: {
      clickFocus: '='
    },
    restrict: 'A',
    link: function ($scope, $elem) {
      function handler() {
        const focusElem = $.find('input[name=' + $scope.clickFocus + ']');
        if (focusElem[0]) focusElem[0].focus();
      }

      $elem.bind('click', handler);
      $scope.$on('$destroy', _.bindKey($elem, 'unbind', 'click', handler));
    }
  };
});
