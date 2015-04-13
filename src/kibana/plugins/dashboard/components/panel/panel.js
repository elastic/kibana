define(function (require) {
  var moment = require('moment');
  var filterManager = require('components/filter_manager/filter_manager');
  var $ = require('jquery');
  require('modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private, $compile) {
    var _ = require('lodash');
    var loadPanel = Private(require('plugins/dashboard/components/panel/lib/load_panel'));
    var notify = new Notifier();

    require('components/visualize/visualize');
    require('components/doc_table/doc_table');

    var brushEvent = Private(require('utils/brush_event'));

    return {
      restrict: 'E',
      template: require('text!plugins/dashboard/components/panel/panel.html'),
      requires: '^dashboardGrid',
      link: function ($scope, $el) {
        // using $scope inheritance, panels are available in AppState
        var $state = $scope.state;

        // receives $scope.panel from the dashboard grid directive, seems like should be isolate?
        $scope.$watch('id', function (id) {
          if (!$scope.panel.id || !$scope.panel.type) return;

          loadPanel($scope.panel, $scope).then(function (panelConfig) {
            // These could be done in loadPanel, putting them here to make them more explicit
            $scope.savedObj = panelConfig.savedObj;
            $scope.edit = panelConfig.edit;
            $scope.$on('$destroy', panelConfig.savedObj.destroy);

            filterManager.init($state);
            $scope.filter = function (field, value, operator) {
              var index = $scope.savedObj.searchSource.get('index').id;
              filterManager.add(field, value, operator, index);
            };
          }).catch(function (e) {
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
