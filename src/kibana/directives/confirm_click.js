define(function (require) {
  require('modules')
    .get('kibana/directives')
    .directive('confirmClick', function () {
      return {
        restrict: 'A',
        link: function ($scope, $elem, attrs) {
          $elem.bind('click', function () {
            var message = attrs.confirmation || 'Are you sure?';
            if (window.confirm(message)) {
              var action = attrs.confirmClick;
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