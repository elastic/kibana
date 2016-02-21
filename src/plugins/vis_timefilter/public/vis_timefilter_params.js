import uiModules from 'ui/modules';

uiModules.get('visualize')
.directive('visTimefilterParams',
  function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/vis_timefilter/vis_timefilter_params.html'),
      scope: {
        vis: '=',
      },
      link: function ($scope, $el) {
        $scope.addTimeset = function () {
          $scope.vis.vistime.addNewTimeset($scope.vis.params);
        };

        $scope.availableCount = function () {
          return $scope.available().length;
        };

        $scope.available = function () {
          return $scope.vis.vistime.getAvailable($scope.vis.params);
        };

        $scope.moveUp = function (ix) {
          var av = $scope.available();
          var tmp = av[ix];
          av[ix] = av[ix - 1];
          av[ix - 1] = tmp;
        };

        $scope.moveDown = function (ix) {
          var av = $scope.available();
          var tmp = av[ix];
          av[ix] = av[ix + 1];
          av[ix + 1] = tmp;
        };

        $scope.remove = function (ix) {
          $scope.vis.vistime.remove(ix, $scope.vis.params);
        };
      }
    };
  }
);
