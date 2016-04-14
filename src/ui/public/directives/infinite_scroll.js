define(function (require) {
  let module = require('ui/modules').get('kibana');
  let $ = require('jquery');

  module.directive('kbnInfiniteScroll', function () {
    return {
      restrict: 'E',
      scope: {
        more: '='
      },
      link: function ($scope, $element, attrs) {
        let $window = $(window);
        let checkTimer;

        function onScroll() {
          if (!$scope.more) return;

          let winHeight = $window.height();
          let winBottom = winHeight + $window.scrollTop();
          let elTop = $element.offset().top;
          let remaining = elTop - winBottom;

          if (remaining <= winHeight * 0.50) {
            $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
              let more = $scope.more();
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
