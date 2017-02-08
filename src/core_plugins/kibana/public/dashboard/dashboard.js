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
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { DashboardConstants } from './dashboard_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { DashboardState } from './dashboard_state';
import { PanelUtils } from './panel/panel_utils';

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

      // Brand new dashboards are defaulted to edit mode, existing ones default to view mode, except when trumped
      // by a url param.
      const defaultViewMode =
        $route.current.params[DashboardConstants.VIEW_MODE_PARAM] ||
        (dash.id ? DashboardViewMode.VIEW : DashboardViewMode.EDIT);
      kbnUrl.removeParam(DashboardConstants.VIEW_MODE_PARAM);

      const dashboardState = new DashboardState(
        dash,
        timefilter,
        !getAppState.previouslyStored(),
        defaultViewMode,
        quickRanges,
        AppState);

      dashboardState.updateQueryOnRootSource(queryFilter);
      let pendingVisCount = _.size(dashboardState.getPanels());

      timefilter.enabled = true;
      courier.setRootSearchSource(dash.searchSource);

      // Following the "best practice" of always have a '.' in your ng-models –
      // https://github.com/angular/angular.js/wiki/Understanding-Scopes
      $scope.model = { query: dashboardState.getQuery() };

      $scope.panels = dashboardState.getPanels();
      $scope.options = dashboardState.getOptions();
      $scope.refresh = _.bindKey(courier, 'fetch');
      $scope.timefilter = timefilter;
      $scope.getBrushEvent = () => brushEvent(dashboardState.getAppState());
      $scope.getFilterBarClickHandler = () => filterBarClickHandler(dashboardState.getAppState());
      $scope.expandedPanel = null;

      $scope.hasExpandedPanel = () => $scope.expandedPanel !== null;
      $scope.getDashTitle = () => DashboardStrings.getDashboardTitle(dashboardState);
      $scope.newDashboard = () => { kbnUrl.change(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}); };
      $scope.saveState = () => dashboardState.saveState();

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
        dashboardState.updateQueryOnRootSource(queryFilter);
        $scope.refresh();
      };

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit) {
        pendingVisCount++;
        const maxPanelIndex = PanelUtils.getMaxPanelIndex(dashboardState.getPanels());
        dashboardState.getPanels().push(createPanelState(hit.id, 'visualization', maxPanelIndex));
      };

      $scope.addSearch = function (hit) {
        pendingVisCount++;
        const maxPanelIndex = PanelUtils.getMaxPanelIndex(dashboardState.getPanels());
        dashboardState.getPanels().push(createPanelState(hit.id, 'search', maxPanelIndex));
      };

      $scope.showEditHelpText = () => {
        return !dashboardState.getPanels().length && dashboardState.getViewMode() === DashboardViewMode.EDIT;
      };

      $scope.showViewHelpText = () => {
        return !dashboardState.getPanels().length && dashboardState.getViewMode() === DashboardViewMode.VIEW;
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

      $scope.onPanelRemoved = (panelIndex) => {
        _.remove(dashboardState.getPanels(), function (panel) {
          if (panel.panelIndex === panelIndex) {
            dashboardState.uiState.removeChild(getPersistedStateId(panel));
            return true;
          } else {
            return false;
          }
        });
        dashboardState.saveState();
      };

      $scope.brushEvent = brushEvent;
      $scope.filterBarClickHandler = filterBarClickHandler;
      $scope.expandedPanel = null;
      $scope.hasExpandedPanel = () => $scope.expandedPanel !== null;
      $scope.toggleExpandPanel = (panelIndex) => {
        if ($scope.expandedPanel && $scope.expandedPanel.panelIndex === panelIndex) {
          $scope.expandedPanel = null;
        } else {
          $scope.expandedPanel =
            $scope.state.panels.find((panel) => panel.panelIndex === panelIndex);
        }
        dashboardState.saveState();
      };

      $scope.save = function () {
        // Make sure to save the latest query, even if 'enter' hasn't been hit.
        dashboardState.updateQueryOnRootSource(queryFilter);
        return dashboardState.saveDashboard(angular.toJson).then(function (id) {
          $scope.kbnTopNav.close('save');
          if (id) {
            notify.info(`Saved Dashboard as "${dash.title}"`);
            if (dash.id !== $routeParams.id) {
              kbnUrl.change(
                `${DashboardConstants.EXISTING_DASHBOARD_URL}?${DashboardConstants.VIEW_MODE_PARAM}=${DashboardViewMode.EDIT}`,
                { id: dash.id });
            } else {
              docTitle.change(dash.lastSavedTitle);
            }
          }
        }).catch(notify.fatal);
      };

      $scope.$watchCollection('options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) dashboardState.save();
      });
      $scope.$watch('options.darkTheme', setDarkTheme);

      $scope.$watch('model.query', function () {
        dashboardState.setQuery($scope.model.query);
      });

      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        dashboardState.updateQueryOnRootSource(queryFilter);
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

      $scope.$on('$destroy', () => {
        dashboardState.destroy();

        // Remove dark theme to keep it from affecting the appearance of other apps.
        setDarkTheme(false);
      });

      const changeViewMode = (newMode) => {
        const isPageRefresh = newMode === dashboardState.getViewMode();
        const enteringEditMode = !isPageRefresh && newMode === DashboardViewMode.EDIT;
        const leavingEditMode = !isPageRefresh && newMode === DashboardViewMode.VIEW;

        function doModeSwitch() {
          $scope.dashboardViewMode = newMode;
          $scope.topNavMenu = getTopNavConfig(newMode, kbnUrl, changeViewMode);
          dashboardState.switchViewMode(newMode);
        }

        if (leavingEditMode && dashboardState.getIsDirty()) {
          function onConfirm() {
            $scope.save().then(doModeSwitch);
          }

          function onCancel() {
            dashboardState.reloadLastSavedFilters();
            const refreshUrl = dashboardState.getReloadDashboardUrl();
            kbnUrl.change(refreshUrl.url, refreshUrl.options);
            doModeSwitch();
          }

          confirmModal(
            DashboardStrings.getUnsavedChangesWarningMessage(dashboardState),
            {
              onConfirm,
              onCancel,
              onClose: _.noop,
              confirmButtonText: 'Save dashboard',
              cancelButtonText: 'Lose changes',
              title: 'Unsaved changes',
              showClose: true
            }
          );
        } else if (enteringEditMode && dashboardState.getFiltersChangedFromLastSave()) {
          function onLoadSavedFilters() {
            dashboardState.reloadLastSavedFilters();
            $scope.model.query = dashboardState.getQuery();
            $scope.filterResults();
            doModeSwitch();
          }

          confirmModal(
            DashboardStrings.getFiltersDifferWarningMessage(dashboardState),
            {
              onConfirm: onLoadSavedFilters,
              onCancel: () => doModeSwitch(),
              onClose: _.noop,
              confirmButtonText: 'Load dashboard defaults',
              cancelButtonText: 'Use current values',
              title: 'Conflict detected',
              showClose: true
            });
        } else {
          // No special handling, just make the switch.
          doModeSwitch();
        }
      };

      changeViewMode(dashboardState.getViewMode());

      function setDarkTheme(enabled) {
        const theme = Boolean(enabled) ? 'theme-dark' : 'theme-light';
        chrome.removeApplicationClass(['theme-dark', 'theme-light']);
        chrome.addApplicationClass(theme);
      }

      $scope.$on('ready:vis', function () {
        if (pendingVisCount) pendingVisCount--;
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
        kbnUrl.change(`/visualize?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
      };

      // Setup configurable values for config directive, after objects are initialized
      $scope.opts = {
        dashboard: dash,
        ui: dashboardState.getOptions(),
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
