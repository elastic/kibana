define(function (require) {
  var module = require('modules').get('kibana');
  var _ = require('lodash');
  var $ = require('jquery');

  module.directive('inputFocus', function ($timeout) {
    return {
      scope: {
        inputFocus: '=?'
      },
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        // If we are passed anything, treat it as the name for a input, and focus that.
        if (!_.isUndefined($scope.inputFocus)) {
          $elem.bind('click', function () {
            var focusElem = $.find('input[name=' + $scope.inputFocus + ']');
            if (focusElem[0]) focusElem[0].focus();
          });
          $scope.$on('$destroy', $elem.unbind);
        } else {
          // Need to wait for a tick, otherwise the focus() doesn't work
          $timeout(function () {
            $elem[0].focus();
          });
        }
      }
    };
  });
});