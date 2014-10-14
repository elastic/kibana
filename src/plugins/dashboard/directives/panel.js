define(function (require) {
  require('modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, Notifier) {
    var _ = require('lodash');

    var notify = new Notifier();

    require('components/visualize/visualize');

    return {
      restrict: 'E',
      template: require('text!plugins/dashboard/partials/panel.html'),
      requires: '^dashboardGrid',
      link: function ($scope, $el) {
        // using $scope inheritance, panels are available in AppState
        var $state = $scope.state;

        // receives panel object from the dashboard grid directive
        $scope.$watch('visId', function (visId) {
          delete $scope.vis;
          if (!$scope.panel.visId) return;

          savedVisualizations.get($scope.panel.visId)
          .then(function (savedVis) {
            $scope.savedVis = savedVis;
            // .destroy() called by the visualize directive
          })
          .catch(function (e) {
            $scope.error = e.message;
          });
        });

        $scope.remove = function () {
          _.pull($state.panels, $scope.panel);
        };
      }
    };
  });
});