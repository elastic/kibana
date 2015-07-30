define(function (require) {
  var moment = require('moment');
  var $ = require('jquery');
  require('ui/modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private, $injector) {
    var _ = require('lodash');
    var loadPanel = Private(require('plugins/kibana/dashboard/components/panel/lib/load_panel'));
    var filterManager = Private(require('ui/filter_manager'));
    var notify = new Notifier();

    var services = require('plugins/kibana/settings/saved_object_registry').all().map(function (serviceObj) {
      var service = $injector.get(serviceObj.service);
      return {
        type: service.type,
        name: serviceObj.service
      };
    });

    require('ui/visualize');
    require('ui/doc_table');

    var brushEvent = Private(require('ui/utils/brush_event'));

    return {
      restrict: 'E',
      template: require('plugins/kibana/dashboard/components/panel/panel.html'),
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
            $scope.editUrl = panelConfig.editUrl;
            $scope.$on('$destroy', panelConfig.savedObj.destroy);

            $scope.filter = function (field, value, operator) {
              var index = $scope.savedObj.searchSource.get('index').id;
              filterManager.add(field, value, operator, index);
            };
          }).catch(function (e) {
            $scope.error = e.message;

            // If the savedObjectType matches the panel type, this means the object itself has been deleted,
            // so we shouldn't even have an edit link. If they don't match, it means something else is wrong
            // with the object (but the object still exists), so we link to the object editor instead.
            var objectItselfDeleted = e.savedObjectType === $scope.panel.type;
            if (objectItselfDeleted) return;

            var type = $scope.panel.type;
            var id = $scope.panel.id;
            var service = _.find(services, { type: type });
            if (!service) return;

            $scope.editUrl = '#settings/objects/' + service.name + '/' + id + '?notFound=' + e.savedObjectType;
          });

        });

        $scope.remove = function () {
          _.pull($state.panels, $scope.panel);
        };
      }
    };
  });
});
