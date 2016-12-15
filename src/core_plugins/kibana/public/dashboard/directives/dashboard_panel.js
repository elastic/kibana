import _ from 'lodash';
import 'ui/visualize';
import 'ui/doc_table';
import { loadPanelProvider } from 'plugins/kibana/dashboard/components/panel/lib/load_panel';
import FilterManagerProvider from 'ui/filter_manager';
import uiModules from 'ui/modules';
import panelTemplate from 'plugins/kibana/dashboard/components/panel/panel.html';
import { DashboardViewMode } from 'plugins/kibana/dashboard/dashboard_view_mode';

uiModules
.get('app/dashboard')
.directive('dashboardPanel', function (savedVisualizations, savedSearches, Notifier, Private, $injector) {
  const loadPanel = Private(loadPanelProvider);
  const filterManager = Private(FilterManagerProvider);

  const services = require('plugins/kibana/management/saved_object_registry').all().map(function (serviceObj) {
    const service = $injector.get(serviceObj.service);
    return {
      type: service.type,
      name: serviceObj.service
    };
  });

  /**
   * Returns a unique id for storing the panel state in the persistent ui.
   * @param {PanelState} panel
   * @returns {string}
   */
  const getPersistedStateId = function (panel) {
    return `P-${panel.panelIndex}`;
  };

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
       * The parent's persisted state is used to create a child persisted state for the
       * panel.
       * @type {PersistedState}
       */
      parentUiState: '=',
      /**
       * Contains information about this panel.
       * @type {PanelState}
       */
      panel: '=',
      /**
       * Handles removing this panel from the grid.
       * @type {() => void}
       */
      remove: '&',
      /**
       * We have to pass the dashboard state on through because filter bar click handlers expect it, as well
       * as saved searches. We need to remove reliance there before we can break it out here.
       * See https://github.com/elastic/kibana/issues/9558 for more information.
       */
      state: '=',
      /**
       * Expand or collapse the current panel, so it either takes up the whole screen or goes back to its
       * natural size.
       * @type {function}
       */
      toggleExpand: '&',
      /**
       * @type {boolean}
       */
      isExpanded: '='
    },
    link: function ($scope, element) {
      if (!$scope.panel.id || !$scope.panel.type) return;

      loadPanel($scope.panel, $scope)
      .then(function (panelConfig) {
        // These could be done in loadPanel, putting them here to make them more explicit
        $scope.savedObj = panelConfig.savedObj;
        $scope.editUrl = panelConfig.editUrl;

        element.on('$destroy', function () {
          panelConfig.savedObj.destroy();
          $scope.parentUiState.removeChild(getPersistedStateId(panelConfig.panel));
          $scope.$destroy();
        });

        // create child ui state from the savedObj
        const uiState = panelConfig.uiState || {};
        $scope.uiState = $scope.parentUiState.createChild(getPersistedStateId(panelConfig.panel), uiState, true);
        const panelSavedVis = _.get(panelConfig, 'savedObj.vis');  // Sometimes this will be a search, and undef
        if (panelSavedVis) {
          panelSavedVis.setUiState($scope.uiState);
        }

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
