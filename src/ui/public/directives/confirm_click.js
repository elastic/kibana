import { uiModules } from 'ui/modules';
uiModules
.get('kibana')
.directive('confirmClick', function ($window) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      $elem.bind('click', function () {
        const message = attrs.confirmation || 'Are you sure?';
        if ($window.confirm(message)) { // eslint-disable-line no-alert
          const action = attrs.confirmClick;
          if (action) {
            $scope.$apply($scope.$eval(action));
          }
        }
      });

      $scope.$on('$destroy', function () {
        $elem.unbind('click');
      });
    },
  };
});
