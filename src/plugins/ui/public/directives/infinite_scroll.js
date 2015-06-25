define(function (require) {
  var module = require('modules').get('kibana');
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
          var winBottom = winHeight + $window.scrollTop();
          var elTop = $element.offset().top;
          var remaining = elTop - winBottom;

          if (remaining <= winHeight * 0.50) {
            $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
              var more = $scope.more();
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