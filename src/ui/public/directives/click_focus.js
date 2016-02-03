import _ from 'lodash';
import $ from 'jquery';
var module = require('ui/modules').get('kibana');

module.directive('clickFocus', function () {
  return {
    scope: {
      clickFocus: '='
    },
    restrict: 'A',
    link: function ($scope, $elem) {
      function handler() {
        var focusElem = $.find('input[name=' + $scope.clickFocus + ']');
        if (focusElem[0]) focusElem[0].focus();
      }

      $elem.bind('click', handler);
      $scope.$on('$destroy', _.bindKey($elem, 'unbind', 'click', handler));
    }
  };
});
