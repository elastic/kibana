import 'ui/visualize';
import 'ui/doc_table';
import 'plugins/kibana/visualize/saved_visualizations';
import 'plugins/kibana/discover/saved_searches';
import { uiModules } from 'ui/modules';
import panelTemplate from 'plugins/kibana/dashboard/panel/panel.html';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import { DashboardViewMode } from '../dashboard_view_mode';
import { EmbeddableHandlersRegistryProvider } from 'ui/embeddable/embeddable_handlers_registry';

uiModules
.get('app/dashboard')
.directive('dashboardPanel', function (Notifier, Private, $injector) {
  const services = savedObjectManagementRegistry.all().map(function (serviceObj) {
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
       * Registers an index pattern with the dashboard app used by this panel. Used by the filter bar for
       * generating field suggestions.
       * @type {function(IndexPattern)}
       */
      registerPanelIndexPattern: '=',
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
       * Call when changes should be propagated to the url and thus saved in state.
       * @type {function}
       */
      saveState: '=',
      /**
       * @type {Object}
       */
      saveState: '=',
      appState: '=',
    },
    link: function ($scope, element) {
      if (!$scope.panel.id || !$scope.panel.type) return;

      const savePanelState = (panel) => {
        $scope.panel = Object.assign($scope.panel, panel);
        $scope.saveState();
      };

      $scope.isViewOnlyMode = () => {
        return $scope.dashboardViewMode === DashboardViewMode.VIEW || $scope.isFullScreenMode;
      };

      const containerAPI = {
        savePanelState,
        getAppState: () => $scope.appState,
        getIsViewOnlyMode: $scope.isViewOnlyMode,
        createChildUiState: $scope.createChildUiState,
        registerPanelIndexPattern: $scope.registerPanelIndexPattern,
      };

      const panelId = $scope.panel.id;
      const handleError = (error) => {
        $scope.error = error.message;

        // Dashboard listens for this broadcast, once for every visualization (pendingVisCount).
        // We need to broadcast even in the event of an error or it'll never fetch the data for
        // other visualizations.
        $scope.$root.$broadcast('ready:vis');

        // If the savedObjectType matches the panel type, this means the object itself has been deleted,
        // so we shouldn't even have an edit link. If they don't match, it means something else is wrong
        // with the object (but the object still exists), so we link to the object editor instead.
        const objectItselfDeleted = error.savedObjectType === $scope.panel.type;
        if (objectItselfDeleted) return;

        const type = $scope.panel.type;
        const service = services.find(service => service.type === type);
        if (!service) return;

        $scope.editUrl = '#management/kibana/objects/' + service.name + '/' + panelId + '?notFound=' + error.savedObjectType;
      };

      const embeddableHandlers = Private(EmbeddableHandlersRegistryProvider);
      const embeddableHandler = embeddableHandlers.byName[$scope.panel.type];
      if (!embeddableHandler) {
        handleError(`No embeddable handler for panel type ${$scope.panel.type} was found.`);
        return;
      }
      $scope.editUrl = embeddableHandler.getEditPath(panelId);
      embeddableHandler.getTitleFor(panelId).then(title => {
        $scope.title = title;
      });
      $scope.loadedPanel =
        embeddableHandler.render(element.find('#embeddedPanel').get(0), $scope.panel, containerAPI).catch(handleError);
    }
  };
});
