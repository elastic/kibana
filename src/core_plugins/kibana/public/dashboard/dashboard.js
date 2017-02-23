import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';

import 'plugins/kibana/dashboard/grid';
import 'plugins/kibana/dashboard/panel/panel';

import dashboardTemplate from 'plugins/kibana/dashboard/dashboard.html';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { DashboardConstants } from './dashboard_constants';
import { VisualizeConstants } from 'plugins/kibana/visualize/visualize_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import { FilterUtils } from './filter_utils';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

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

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl, Private) {
  const brushEvent = Private(UtilsBrushEventProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: function ($scope, $rootScope, $route, $routeParams, $location, Private, getAppState) {

      const queryFilter = Private(FilterBarQueryFilterProvider);

      const notify = new Notifier({
        location: 'Dashboard'
      });

      const dash = $scope.dash = $route.current.locals.dash;

      if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
        timefilter.time.to = dash.timeTo;
        timefilter.time.from = dash.timeFrom;
        if (dash.refreshInterval) {
          timefilter.refreshInterval = dash.refreshInterval;
        }
      }

      const stateDefaults = {
        title: dash.title,
        panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
        options: dash.optionsJSON ? JSON.parse(dash.optionsJSON) : {},
        uiState: dash.uiStateJSON ? JSON.parse(dash.uiStateJSON) : {},
        query: FilterUtils.getQueryFilterForDashboard(dash),
        filters: FilterUtils.getFilterBarsForDashboard(dash),
      };

      let stateMonitor;
      const $state = $scope.state = new AppState(stateDefaults);
      const $uiState = $scope.uiState = $state.makeStateful('uiState');
      const $appStatus = $scope.appStatus = this.appStatus = { dirty: !dash.id };

      $scope.$watchCollection('state.options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) $state.save();
      });

      $scope.$watch('state.options.darkTheme', setDarkTheme);

      $scope.topNavMenu = getTopNavConfig(kbnUrl);

      $scope.refresh = _.bindKey(courier, 'fetch');

      timefilter.enabled = true;
      $scope.timefilter = timefilter;
      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      courier.setRootSearchSource(dash.searchSource);

      const docTitle = Private(DocTitleProvider);

      function init() {
        updateQueryOnRootSource();

        if (dash.id) {
          docTitle.change(dash.title);
        }

        initPanelIndexes();

        // watch for state changes and update the appStatus.dirty value
        stateMonitor = stateMonitorFactory.create($state, stateDefaults);
        stateMonitor.onChange((status) => {
          $appStatus.dirty = status.dirty || !dash.id;
        });

        $scope.$on('$destroy', () => {
          stateMonitor.destroy();
          dash.destroy();

          // Remove dark theme to keep it from affecting the appearance of other apps.
          setDarkTheme(false);
        });

        $scope.$emit('application.load');
      }

      function initPanelIndexes() {
        // find the largest panelIndex in all the panels
        let maxIndex = getMaxPanelIndex();

        // ensure that all panels have a panelIndex
        $scope.state.panels.forEach(function (panel) {
          if (!panel.panelIndex) {
            panel.panelIndex = maxIndex++;
          }
        });
      }

      function getMaxPanelIndex() {
        let maxId = $scope.state.panels.reduce(function (id, panel) {
          return Math.max(id, panel.panelIndex || id);
        }, 0);
        return ++maxId;
      }

      function updateQueryOnRootSource() {
        const filters = queryFilter.getFilters();
        if ($state.query) {
          dash.searchSource.set('filter', _.union(filters, [{
            query: $state.query
          }]));
        } else {
          dash.searchSource.set('filter', filters);
        }
      }

      function setDarkTheme(enabled) {
        const theme = Boolean(enabled) ? 'theme-dark' : 'theme-light';
        chrome.removeApplicationClass(['theme-dark', 'theme-light']);
        chrome.addApplicationClass(theme);
      }


      /**
       * Creates a child ui state for the panel. It's passed the ui state to use, but needs to
       * be generated from the parent (why, I don't know yet).
       * @param path {String} - the unique path for this ui state.
       * @param uiState {Object} - the uiState for the child.
       * @returns {Object}
       */
      $scope.createChildUiState = function createChildUiState(path, uiState) {
        return $scope.uiState.createChild(path, uiState, true);
      };

      $scope.saveState = function saveState() {
        $state.save();
      };

      $scope.onPanelRemoved = (panelIndex) => {
        _.remove($scope.state.panels, function (panel) {
          if (panel.panelIndex === panelIndex) {
            $scope.uiState.removeChild(getPersistedStateId(panel));
            return true;
          } else {
            return false;
          }
        });
        $state.save();
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
      };

      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        updateQueryOnRootSource();
        $state.save();
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

      $scope.getDashTitle = function () {
        return dash.lastSavedTitle || `${dash.title} (unsaved)`;
      };

      $scope.newDashboard = function () {
        kbnUrl.change('/dashboard', {});
      };

      $scope.filterResults = function () {
        updateQueryOnRootSource();
        $state.save();
        $scope.refresh();
      };

      $scope.save = function () {
        $state.save();

        const timeRestoreObj = _.pick(timefilter.refreshInterval, ['display', 'pause', 'section', 'value']);

        dash.panelsJSON = angular.toJson($state.panels);
        dash.uiStateJSON = angular.toJson($uiState.getChanges());
        dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
        dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;
        dash.refreshInterval = dash.timeRestore ? timeRestoreObj : undefined;
        dash.optionsJSON = angular.toJson($state.options);

        dash.save()
          .then(function (id) {
            stateMonitor.setInitialState($state.toJSON());
            $scope.kbnTopNav.close('save');
            if (id) {
              notify.info('Saved Dashboard as "' + dash.title + '"');
              if (dash.id !== $routeParams.id) {
                kbnUrl.change('/dashboard/{{id}}', { id: dash.id });
              } else {
                docTitle.change(dash.lastSavedTitle);
              }
            }
          })
          .catch(notify.fatal);
      };

      let pendingVis = _.size($state.panels);
      $scope.$on('ready:vis', function () {
        if (pendingVis) pendingVis--;
        if (pendingVis === 0) {
          $state.save();
          $scope.refresh();
        }
      });

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit) {
        pendingVis++;
        $state.panels.push(createPanelState(hit.id, 'visualization', getMaxPanelIndex()));
      };

      if ($route.current.params && $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
        $scope.addVis({ id: $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM] });
        kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
        kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
      }

      const addNewVis = function addNewVis() {
        kbnUrl.change(
          `${VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
      };

      $scope.addSearch = function (hit) {
        pendingVis++;
        $state.panels.push(createPanelState(hit.id, 'search', getMaxPanelIndex()));
      };

      // Setup configurable values for config directive, after objects are initialized
      $scope.opts = {
        dashboard: dash,
        ui: $state.options,
        save: $scope.save,
        addVis: $scope.addVis,
        addNewVis,
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter
      };

      init();

      $scope.showEditHelpText = () => {
        return !$scope.state.panels.length;
      };
    }
  };
});
