import $ from 'jquery';
import uiModules from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('kbnInfiniteScroll', function () {
  return {
    restrict: 'E',
    scope: {
      more: '='
    },
    link: function ($scope, $element) {
      const $window = $(window);
      let checkTimer;

      function onScroll() {
        if (!$scope.more) return;

        const winHeight = $window.height();
        const winBottom = winHeight + $window.scrollTop();
        const elTop = $element.offset().top;
        const remaining = elTop - winBottom;

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
