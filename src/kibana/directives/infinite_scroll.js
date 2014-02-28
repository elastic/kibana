define(function (require) {
  var module = require('angular').module('kibana/directives');
  var $ = require('jquery');

  module.directive('kbnInfiniteScroll', function () {
    return {
      restrict: 'E',
      scope: {
        more: '='
      },
      link: function ($scope, $element, attrs) {
        var $window = $(window);
        var checkTimer;

        function onScroll() {
          if (!$scope.more) return;

          var winHeight = $window.height();
          var windowBottom = winHeight + $window.scrollTop();
          var elementBottom = $element.offset().top + $element.height();
          var remaining = elementBottom - windowBottom;

          if (remaining <= winHeight * 0.50) {
            $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
              $scope.more();
            });
          }
        }

        function scheduleCheck() {
          if (checkTimer) return;
          checkTimer = setTimeout(function () {
            checkTimer = null;
            onScroll();
          }, 50);
        }

        $window.on('scroll', scheduleCheck);
        $scope.$on('$destroy', function () {
          clearTimeout(checkTimer);
          $window.off('scroll', scheduleCheck);
        });
        scheduleCheck();
      }
    };
  });
});