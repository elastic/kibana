define(function (require) {
  var moment = require('moment');
  require('modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, Notifier, Private) {
    var _ = require('lodash');
    var filterBarClickHandler = Private(require('components/filter_bar/filter_bar_click_handler'));

    var notify = new Notifier();

    require('components/visualize/visualize');
    var brushEvent = Private(require('utils/brush_event'));

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
            $scope.$on('$destroy', savedVis.destroy);
            savedVis.vis.listeners.click = filterBarClickHandler($state);
            savedVis.vis.listeners.brush = brushEvent;
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
