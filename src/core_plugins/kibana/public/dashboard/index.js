import _ from 'lodash';
import angular from 'angular';
import chrome from 'ui/chrome';
import 'ui/courier';
import 'ui/config';
import 'ui/notify';
import 'ui/typeahead';
import 'ui/share';
import 'plugins/kibana/dashboard/directives/grid';
import 'plugins/kibana/dashboard/directives/dashboard_panel';
import 'plugins/kibana/dashboard/services/saved_dashboards';
import 'plugins/kibana/dashboard/styles/main.less';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/dashboard/index.html';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/services/saved_dashboard_register';
import { DashboardViewMode } from './dashboard_view_mode';
import { getTopNavConfig } from './get_top_nav_config';
import { createPanelState } from 'plugins/kibana/dashboard/components/panel/lib/panel_state';
import { DashboardConstants } from './dashboard_constants';

require('ui/saved_objects/saved_object_registry').register(savedDashboardRegister);

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead'
]);

uiRoutes
.defaults(/dashboard/, {
  requireDefaultIndex: true
})
.when('/dashboard', {
  template: indexTemplate,
  resolve: {
    dash: function (savedDashboards, config) {
      return savedDashboards.get();
    }
  }
})
.when('/dashboard/:id', {
  template: indexTemplate,
  resolve: {
    dash: function (savedDashboards, Notifier, $route, $location, courier) {
      return savedDashboards.get($route.current.params.id)
      .catch(courier.redirectWhenMissing({
        'dashboard' : '/dashboard'
      }));
    }
  }
});

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl, safeConfirm) {
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

      /**
       * @param filter {Object}
       * @returns {boolean} True if the given filter is a query filter (e.g. should go in
       * the query bar and not in the filter bar)
       */
      const matchQueryFilter = function (filter) {
        return filter.query && filter.query.query_string && !filter.meta;
      };

      const extractQueryFromFilters = function (filters) {
        const filter = _.find(filters, matchQueryFilter);
        if (filter) return filter.query;
      };

      const stateDefaults = {
        title: dash.title,
        panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
        options: dash.optionsJSON ? JSON.parse(dash.optionsJSON) : {},
        uiState: dash.uiStateJSON ? JSON.parse(dash.uiStateJSON) : {},
        query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || { query_string: { query: '*' } },
        filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter),
      };

      let savedDashTimeFrom = dash.timeFrom;
      let savedDashTimeTo = dash.timeTo;
      let savedDashFilters = _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter);
      let savedDashQuery = stateDefaults.query;

      let stateMonitor;
      const $state = $scope.state = new AppState(stateDefaults);
      const $uiState = $scope.uiState = $state.makeStateful('uiState');
      const $appStatus = $scope.appStatus = this.appStatus = {};

      $scope.$watchCollection('state.options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) $state.save();
      });

      $scope.$watch('state.options.darkTheme', setDarkTheme);

      // A hashkey in the filter array will ruin our comparison, so we need to get rid of it.
      const cleanFiltersForComparison = (filters) => _.map(filters, (filter) => _.omit(filter, '$$hashKey'));
      const filterMismatch = () =>
        !_.isEqual(cleanFiltersForComparison($state.filters), cleanFiltersForComparison(savedDashFilters)) ||
        !_.isEqual($state.query, savedDashQuery);
      const timeMismatch = () => savedDashTimeFrom !== timefilter.time.from || savedDashTimeTo !== timefilter.time.to;

      const changeViewMode = (newMode) => {
        const defaultFiltersChanged = filterMismatch() || (dash.timeRestore && timeMismatch());

        // Time changes don't propagate to stateMonitor so we must track that dirty state manually.
        if (($appStatus.dirty || (dash.timeRestore && timeMismatch())) &&
            newMode === DashboardViewMode.VIEW) {
          safeConfirm(
              'Warning! You have unsaved changes to your dashboard. You can save them or exit without saving and lose your changes.',
              'Save dashboard',
              'Lose changes')
            .then(() => {
              $scope.save().then(() => {
                if (stateMonitor) stateMonitor.destroy();
                if (dash.id) {
                  kbnUrl.change('/dashboard/{{id}}', { id: dash.id });
                } else {
                  kbnUrl.change(`/dashboard?${DashboardConstants.VIEW_MODE_PARAM}=${newMode}`);
                }
              });
            }).catch(() => {
              if (dash.id) {
                kbnUrl.change('/dashboard/{{id}}', { id: dash.id });
              } else {
                kbnUrl.change(`/dashboard?${DashboardConstants.VIEW_MODE_PARAM}=${newMode}`);
              }
            });
        } else {
          $scope.dashboardViewMode = newMode;
          $scope.topNavMenu = getTopNavConfig(newMode, kbnUrl, changeViewMode);
          if (newMode === DashboardViewMode.EDIT) {
            // watch for state changes and update the appStatus.dirty value
            stateMonitor = stateMonitorFactory.create($state, stateDefaults);
            stateMonitor.onChange(status => {
              $appStatus.dirty = status.dirty;
            });
          } else {
            if (stateMonitor) stateMonitor.destroy();
          }
        }

        if (newMode === DashboardViewMode.EDIT && dash.id && defaultFiltersChanged) {
          safeConfirm(
              'Your current filters, query and/or time range are different than those stored with your dashboard.',
              'Load dashboard filters',
              'Use my current filters')
            .then(() => {
              stateDefaults.filters = $state.filters = savedDashFilters.slice();
              stateDefaults.query = $state.query = savedDashQuery;
              if (dash.timeRestore) {
                $scope.timefilter.time.from = savedDashTimeFrom;
                $scope.timefilter.time.to = savedDashTimeTo;
              }

              // We need to recreate the stateMonitor with the new defaults.
              if (stateMonitor) stateMonitor.destroy();
              stateMonitor = stateMonitorFactory.create($state, stateDefaults);
              stateMonitor.onChange(status => { $appStatus.dirty = status.dirty; });

              $appStatus.dirty = false;

              $scope.filterResults();
            }, () => {
              // Something changed from the default and we are porting the edits over to the dashboard.
              // Make sure we update dirty state.
              $appStatus.dirty = true;
            });
        }
      };

      // Brand new dashboards are defaulted to edit mode, existing ones default to view mode.
      const defaultMode =
          $route.current.params[DashboardConstants.VIEW_MODE_PARAM] ||
          (dash.id ? DashboardViewMode.VIEW : DashboardViewMode.EDIT);
      // To avoid view mode being a part of the state, we need to remove it from the url.
      kbnUrl.removeParam(DashboardConstants.VIEW_MODE_PARAM);
      changeViewMode(defaultMode);

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

        $scope.$on('$destroy', () => {
          if (stateMonitor) stateMonitor.destroy();
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
        const displayTitle = dash.lastSavedTitle || `${dash.title} (unsaved)`;
        const isEditMode = $scope.dashboardViewMode === DashboardViewMode.EDIT;
        return isEditMode ? 'Editing ' + displayTitle : displayTitle;
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

        return dash.save()
          .then(function (id) {
            stateMonitor.setInitialState($state.toJSON());
            $scope.kbnTopNav.close('save');
            if (id) {
              notify.info('Saved Dashboard as "' + dash.title + '"');
              if (dash.id !== $routeParams.id) {
                kbnUrl.change(`/dashboard/{{id}}?${DashboardConstants.VIEW_MODE_PARAM}=${DashboardViewMode.EDIT}`, { id: dash.id });
              } else {
                docTitle.change(dash.lastSavedTitle);

                // Reset dashboard defaults for determining if view mode filters differ from dashboard.
                savedDashFilters = $state.filters;
                savedDashQuery = $state.query;
                savedDashTimeFrom = timefilter.time.from;
                savedDashTimeTo = timefilter.time.to;
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

      // listen for notifications from the grid component that changes have
      // been made, rather than watching the panels deeply
      $scope.$on('change:vis', function () {
        $state.save();
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
        kbnUrl.change(`/visualize?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
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
        return !$scope.state.panels.length && $scope.dashboardViewMode === DashboardViewMode.EDIT;
      };

      $scope.showViewHelpText = () => {
        return !$scope.state.panels.length && $scope.dashboardViewMode === DashboardViewMode.VIEW;
      };
    }
  };
});
