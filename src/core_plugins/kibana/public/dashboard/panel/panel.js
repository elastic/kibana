import _ from 'lodash';
import 'ui/visualize';
import 'ui/doc_table';
import 'plugins/kibana/dashboard/panel/get_object_loaders_for_dashboard';
import FilterManagerProvider from 'ui/filter_manager';
import uiModules from 'ui/modules';
import panelTemplate from 'plugins/kibana/dashboard/panel/panel.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { loadSavedObject } from 'plugins/kibana/dashboard/panel/load_saved_object';
import { DashboardViewMode } from '../dashboard_view_mode';

uiModules
.get('app/dashboard')
.directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private, $injector, getObjectLoadersForDashboard) {
  const filterManager = Private(FilterManagerProvider);

  const services = require('plugins/kibana/management/saved_object_registry').all().map(function (serviceObj) {
    const service = $injector.get(serviceObj.service);
    return {
      type: service.type,
      name: serviceObj.service
    };
  });

  return {
    restrict: 'E',
    template: panelTemplate,
    scope: {
      /**
       * What view mode the dashboard is currently in - edit or view only.
       * @type {DashboardViewMode}
       */
      dashboardViewMode: '=',
      /**
       * Whether or not the dashboard this panel is contained on is in 'full screen mode'.
       * @type {boolean}
       */
      isFullScreenMode: '=',
      /**
       * Used to create a child persisted state for the panel from parent state.
       * @type {function} - Returns a {PersistedState} child uiState for this scope.
       */
      createChildUiState: '=',
      /**
       * Contains information about this panel.
       * @type {PanelState}
       */
      panel: '=',
      /**
       * Handles removing this panel from the grid.
       * @type {function}
       */
      remove: '&',
      /**
       * Expand or collapse the current panel, so it either takes up the whole screen or goes back to its
       * natural size.
       * @type {function}
       */
      toggleExpand: '&',
      /**
       * @type {boolean}
       */
      isExpanded: '=',
      /**
       * Returns a click handler for a visualization.
       * @type {function}
       */
      getVisClickHandler: '=',
      /**
       * Returns a brush event handler for a visualization.
       * @type {function}
       */
      getVisBrushHandler: '=',
      /**
       * Call when changes should be propagated to the url and thus saved in state.
       * @type {function}
       */
      saveState: '='
    },
    link: function ($scope, element) {
      if (!$scope.panel.id || !$scope.panel.type) return;

      /**
       * Initializes the panel for the saved object.
       * @param {{savedObj: SavedObject, editUrl: String}} savedObjectInfo
       */
      function initializePanel(savedObjectInfo) {
        $scope.savedObj = savedObjectInfo.savedObj;
        $scope.editUrl = savedObjectInfo.editUrl;

        element.on('$destroy', function () {
          $scope.savedObj.destroy();
          $scope.$destroy();
        });

        // create child ui state from the savedObj
        const uiState = $scope.savedObj.uiStateJSON ? JSON.parse($scope.savedObj.uiStateJSON) : {};
        $scope.uiState = $scope.createChildUiState(getPersistedStateId($scope.panel), uiState);

        if ($scope.panel.type === savedVisualizations.type && $scope.savedObj.vis) {
          $scope.savedObj.vis.setUiState($scope.uiState);
          $scope.savedObj.vis.listeners.click = $scope.getVisClickHandler();
          $scope.savedObj.vis.listeners.brush = $scope.getVisBrushHandler();
        } else if ($scope.panel.type === savedSearches.type) {
          // This causes changes to a saved search to be hidden, but also allows
          // the user to locally modify and save changes to a saved search only in a dashboard.
          // See https://github.com/elastic/kibana/issues/9523 for more details.
          $scope.panel.columns = $scope.panel.columns || $scope.savedObj.columns;
          $scope.panel.sort = $scope.panel.sort || $scope.savedObj.sort;

          // If the user updates the sort direction or columns in a saved search, we want to save that
          // to the ui state so the share url will show our temporary modifications.
          $scope.$watchCollection('panel.columns', function () {
            $scope.saveState();
          });

          $scope.$watchCollection('panel.sort', function () {
            $scope.saveState();
          });
        }

        $scope.filter = function (field, value, operator) {
          const index = $scope.savedObj.searchSource.get('index').id;
          filterManager.add(field, value, operator, index);
        };

      }

      loadSavedObject(getObjectLoadersForDashboard(), $scope.panel)
        .then(initializePanel)
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

          $scope.editUrl = '#management/kibana/objects/' + service.name + '/' + id + '?notFound=' + e.savedObjectType;
        });

      /**
       * Determines whether or not to show edit controls.
       * @returns {boolean}
       */
      $scope.isViewOnlyMode = () => {
        return $scope.dashboardViewMode === DashboardViewMode.VIEW || $scope.isFullScreenMode;
      };
    }
  };
});
