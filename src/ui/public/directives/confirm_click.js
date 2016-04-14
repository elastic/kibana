define(function (require) {
  require('ui/modules')
  .get('kibana')
  .directive('confirmClick', function () {
    return {
      restrict: 'A',
      link: function ($scope, $elem, attrs) {
        $elem.bind('click', function () {
          let message = attrs.confirmation || 'Are you sure?';
          if (window.confirm(message)) { // eslint-disable-line no-alert
            let action = attrs.confirmClick;
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
});
