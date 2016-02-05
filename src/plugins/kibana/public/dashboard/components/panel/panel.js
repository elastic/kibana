define(function (require) {
  const moment = require('moment');
  const $ = require('jquery');
  require('ui/modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private, $injector) {
    const _ = require('lodash');
    const loadPanel = Private(require('plugins/kibana/dashboard/components/panel/lib/load_panel'));
    const filterManager = Private(require('ui/filter_manager'));
    const notify = new Notifier();

    const services = require('plugins/kibana/settings/saved_object_registry').all().map(function (serviceObj) {
      const service = $injector.get(serviceObj.service);
      return {
        type: service.type,
        name: serviceObj.service
      };
    });

    require('ui/visualize');
    require('ui/doc_table');

    const brushEvent = Private(require('ui/utils/brush_event'));

    const getPanelId = function (panel) {
      return ['P', panel.panelIndex].join('-');
    };

    return {
      restrict: 'E',
      template: require('plugins/kibana/dashboard/components/panel/panel.html'),
      requires: '^dashboardGrid',
      link: function ($scope, $el) {
        // using $scope inheritance, panels are available in AppState
        const $state = $scope.state;

        // receives $scope.panel from the dashboard grid directive, seems like should be isolate?
        $scope.$watch('id', function () {
          if (!$scope.panel.id || !$scope.panel.type) return;

          loadPanel($scope.panel, $scope)
          .then(function (panelConfig) {
            // These could be done in loadPanel, putting them here to make them more explicit
            $scope.savedObj = panelConfig.savedObj;
            $scope.editUrl = panelConfig.editUrl;
            $scope.$on('$destroy', function () {
              panelConfig.savedObj.destroy();
              $scope.parentUiState.removeChild(getPanelId(panelConfig.panel));
            });

            // create child ui state from the savedObj
            const uiState = panelConfig.uiState || {};
            $scope.uiState = $scope.parentUiState.createChild(getPanelId(panelConfig.panel), uiState, true);

            $scope.filter = function (field, value, operator) {
              const index = $scope.savedObj.searchSource.get('index').id;
              filterManager.add(field, value, operator, index);
            };
          })
          .catch(function (e) {
            $scope.error = e.message;

            // If the savedObjectType matches the panel type, this means the object itself has been deleted,
            // so we shouldn't even have an edit link. If they don't match, it means something else is wrong
            // with the object (but the object still exists), so we link to the object editor instead.
            const objectItselfDeleted = e.savedObjectType === $scope.panel.type;
            if (objectItselfDeleted) return;

            const type = $scope.panel.type;
            const id = $scope.panel.id;
            const service = _.find(services, { type: type });
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
