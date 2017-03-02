import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';

import 'plugins/kibana/dashboard/grid';
import 'plugins/kibana/dashboard/panel/panel';

import { DashboardStrings } from './dashboard_strings';
import { DashboardViewMode } from './dashboard_view_mode';
import dashboardTemplate from 'plugins/kibana/dashboard/dashboard.html';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { DashboardConstants } from './dashboard_constants';
import { VisualizeConstants } from 'plugins/kibana/visualize/visualize_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import { DashboardState } from './dashboard_state';
import { TopNavIds } from './top_nav/top_nav_ids';
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead'
]);

uiRoutes
  .when('/dashboard/create', {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, courier) {
        return savedDashboards.get()
          .catch(courier.redirectWhenMissing({
            'dashboard': '/dashboard'
          }));
      }
    }
  })
  .when('/dashboard/:id', {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
          .catch(courier.redirectWhenMissing({
            'dashboard' : '/dashboard'
          }));
      }
    }
  });

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, quickRanges, kbnUrl, confirmModal, Private) {
  const brushEvent = Private(UtilsBrushEventProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: function ($scope, $rootScope, $route, $routeParams, $location, Private, getAppState) {
      const queryFilter = Private(FilterBarQueryFilterProvider);
      const docTitle = Private(DocTitleProvider);
      const notify = new Notifier({ location: 'Dashboard' });

      const dash = $scope.dash = $route.current.locals.dash;
      if (dash.id) {
        docTitle.change(dash.title);
      }

      const dashboardState = new DashboardState(dash, AppState);

      if (dashboardState.getIsTimeSavedWithDashboard() && !getAppState.previouslyStored()) {
        dashboardState.syncTimefilterWithDashboard(timefilter, quickRanges);
      }

      // Part of the exposed plugin API - do not remove without careful consideration.
      this.appStatus = {
        dirty: !dash.id
      };
      dashboardState.stateMonitor.onChange(status => {
        this.appStatus.dirty = status.dirty || !dash.id;
      });

      dashboardState.updateFilters(queryFilter);
      let pendingVisCount = _.size(dashboardState.getPanels());

      timefilter.enabled = true;
      dash.searchSource.highlightAll(true);
      dash.searchSource.version(true);
      courier.setRootSearchSource(dash.searchSource);

      // Following the "best practice" of always have a '.' in your ng-models –
      // https://github.com/angular/angular.js/wiki/Understanding-Scopes
      $scope.model = {
        query: dashboardState.getQuery(),
        darkTheme: dashboardState.getDarkTheme(),
        timeRestore: dashboardState.getTimeRestore(),
        title: dashboardState.getTitle()
      };

      $scope.panels = dashboardState.getPanels();
      $scope.refresh = _.bindKey(courier, 'fetch');
      $scope.timefilter = timefilter;
      $scope.expandedPanel = null;
      $scope.dashboardViewMode = dashboardState.getViewMode();

      $scope.getBrushEvent = () => brushEvent(dashboardState.getAppState());
      $scope.getFilterBarClickHandler = () => filterBarClickHandler(dashboardState.getAppState());
      $scope.hasExpandedPanel = () => $scope.expandedPanel !== null;
      $scope.getDashTitle = () => DashboardStrings.getDashboardTitle(
        dashboardState.getTitle(),
        dashboardState.getViewMode(),
        dashboardState.getIsDirty(timefilter));
      $scope.newDashboard = () => { kbnUrl.change(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}); };
      $scope.saveState = () => dashboardState.saveState();
      $scope.showEditHelpText = () => !dashboardState.getPanels().length && dashboardState.getIsEditMode();
      $scope.showViewHelpText = () => !dashboardState.getPanels().length && dashboardState.getIsViewMode();

      $scope.toggleExpandPanel = (panelIndex) => {
        if ($scope.expandedPanel && $scope.expandedPanel.panelIndex === panelIndex) {
          $scope.expandedPanel = null;
        } else {
          $scope.expandedPanel =
            dashboardState.getPanels().find((panel) => panel.panelIndex === panelIndex);
        }
      };

      $scope.filterResults = function () {
        dashboardState.setQuery($scope.model.query);
        dashboardState.updateFilters(queryFilter);
        $scope.refresh();
      };

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit) {
        pendingVisCount++;
        dashboardState.addNewPanel(hit.id, 'visualization');
        notify.info(`Visualization successfully added to your dashboard`);
      };

      $scope.addSearch = function (hit) {
        pendingVisCount++;
        dashboardState.addNewPanel(hit.id, 'search');
        notify.info(`Search successfully added to your dashboard`);
      };

      /**
       * Creates a child ui state for the panel. It's passed the ui state to use, but needs to
       * be generated from the parent (why, I don't know yet).
       * @param path {String} - the unique path for this ui state.
       * @param uiState {Object} - the uiState for the child.
       * @returns {Object}
       */
      $scope.createChildUiState = function createChildUiState(path, uiState) {
        return dashboardState.uiState.createChild(path, uiState, true);
      };

      $scope.onPanelRemoved = (panelIndex) => dashboardState.removePanel(panelIndex);

      $scope.$watch('model.query', () => dashboardState.setQuery($scope.model.query));
      $scope.$watch('model.darkTheme', () => {
        dashboardState.setDarkTheme($scope.model.darkTheme);
        updateTheme();
      });
      $scope.$watch('model.title', () => dashboardState.setTitle($scope.model.title));
      $scope.$watch('model.timeRestore', () => dashboardState.setTimeRestore($scope.model.timeRestore));

      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      // Defined up here, but filled in below, to avoid 'Defined before use' warning due to circular reference:
      // changeViewMode calls updateViewMode, and navActions uses changeViewMode.
      const navActions = {};

      function updateViewMode(newMode) {
        $scope.topNavMenu = getTopNavConfig(newMode, navActions);
        dashboardState.switchViewMode(newMode);
      }

      const onChangeViewMode = (newMode) => {
        const isPageRefresh = newMode === dashboardState.getViewMode();
        const leavingEditMode = !isPageRefresh && newMode === DashboardViewMode.VIEW;
        const willLoseChanges = leavingEditMode && dashboardState.getIsDirty(timefilter);

        if (!willLoseChanges) {
          updateViewMode(newMode);
          return;
        }

        function revertChangesAndExitEditMode() {
          dashboardState.resetState();
          const refreshUrl = dashboardState.getReloadDashboardUrl();
          kbnUrl.change(refreshUrl.url, refreshUrl.options);
          // This is only necessary for new dashboards, which will default to Edit mode.
          updateViewMode(DashboardViewMode.VIEW);
          // We need to do a hard reset of the timefilter, it won't happen automatically because of the
          // getAppState.previouslyStored() check on reload.  Even though we reset appState, it gets saved
          // from the above call to update the view mode.
          if (dashboardState.getIsTimeSavedWithDashboard()) {
            dashboardState.syncTimefilterWithDashboard(timefilter, quickRanges);
          }
        }

        confirmModal(
          DashboardStrings.getUnsavedChangesWarningMessage(dashboardState.getChangedFiltersForDisplay(timefilter)),
          {
            onConfirm: revertChangesAndExitEditMode,
            onCancel: _.noop,
            confirmButtonText: 'Yes, lose changes',
            cancelButtonText: 'No, keep working',
            defaultFocusedButton: ConfirmationButtonTypes.CANCEL
          }
        );
      };

      navActions[TopNavIds.EXIT_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.VIEW);
      navActions[TopNavIds.ENTER_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.EDIT);

      $scope.save = function () {
        return dashboardState.saveDashboard(angular.toJson, timefilter).then(function (id) {
          $scope.kbnTopNav.close('save');
          if (id) {
            notify.info(`Saved Dashboard as "${dash.title}"`);
            if (dash.id !== $routeParams.id) {
              kbnUrl.change(
                `${DashboardConstants.EXISTING_DASHBOARD_URL}`,
                { id: dash.id });
            } else {
              docTitle.change(dash.lastSavedTitle);
              updateViewMode(DashboardViewMode.VIEW);
            }
          }
        }).catch(notify.fatal);
      };

      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        dashboardState.updateFilters(queryFilter);
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

      $scope.$on('$destroy', () => {
        dashboardState.destroy();

        // Remove dark theme to keep it from affecting the appearance of other apps.
        setLightTheme();
      });

      function updateTheme() {
        dashboardState.getDarkTheme() ? setDarkTheme() : setLightTheme();
      }

      function setDarkTheme() {
        chrome.removeApplicationClass(['theme-light']);
        chrome.addApplicationClass('theme-dark');
      }

      function setLightTheme() {
        chrome.removeApplicationClass(['theme-dark']);
        chrome.addApplicationClass('theme-light');
      }
      updateViewMode(dashboardState.getViewMode());

      $scope.$on('ready:vis', function () {
        if (pendingVisCount > 0) pendingVisCount--;
        if (pendingVisCount === 0) {
          dashboardState.saveState();
          $scope.refresh();
        }
      });

      if ($route.current.params && $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
        $scope.addVis({ id: $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM] });
        kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
        kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
      }

      const addNewVis = function addNewVis() {
        kbnUrl.change(
          `${VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
      };


      $scope.opts = {
        displayName: dash.getDisplayName(),
        dashboard: dash,
        save: $scope.save,
        addVis: $scope.addVis,
        addNewVis,
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter
      };

      $scope.$emit('application.load');
    }
  };
});
