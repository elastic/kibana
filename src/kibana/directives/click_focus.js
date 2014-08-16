define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');

  module.directive('clickFocus', function () {
    return {
      scope: {
        clickFocus: '='
      },
      restrict: 'A',
      link: function ($scope, $elem) {
        $elem.bind('click', function () {
          var focusElem = $.find('input[name=' + $scope.clickFocus + ']');
          if (focusElem[0]) focusElem[0].focus();
        });
        $scope.$on('$destroy', $elem.unbind);
      }
    };
  });
});