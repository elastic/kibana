define(function (require) {
  var moment = require('moment');
  require('modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private) {
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

        $scope.view = {};

        // receives panel object from the dashboard grid directive
        $scope.$watch('id', function (id) {
          delete $scope.vis;
          if (!$scope.panel.id || !$scope.panel.type) return;

          switch ($scope.panel.type) {
          case 'visualization':
            savedVisualizations.get($scope.panel.id)
            .then(function (savedVis) {
              $scope.savedVis = savedVis;
              $scope.view.title = savedVis.title;
              $scope.$on('$destroy', savedVis.destroy);
              savedVis.vis.listeners.click = filterBarClickHandler($state);
              savedVis.vis.listeners.brush = brushEvent;
            })
            .catch(function (e) {
              $scope.error = e.message;
            });
            break;
          case 'search':
            savedSearches.get($scope.panel.id)
            .then(function (savedSearch) {
              $scope.$root.$broadcast('ready:vis');

              var searchSource = savedSearch.searchSource;
              $scope.view.title = savedSearch.title;
              searchSource.onResults().then(function onResults(resp) {
                $scope.view.content = resp;
              }).catch(notify.fatal);
            })
            .catch(function (e) {
              $scope.error = e.message;
            });
            break;
          default:
            $scope.error = 'Unknown panel type';
          }
        });

        $scope.remove = function () {
          _.pull($state.panels, $scope.panel);
        };
      }
    };
  });
});
