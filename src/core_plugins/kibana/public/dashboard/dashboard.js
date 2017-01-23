import _ from 'lodash';
import angular from 'angular';
import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'plugins/kibana/dashboard/grid';
import 'plugins/kibana/dashboard/panel/panel';

import { DashboardViewMode } from './dashboard_view_mode';
import dashboardTemplate from 'plugins/kibana/dashboard/dashboard.html';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { DashboardConstants } from './dashboard_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';

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

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl, confirmModal, Private) {
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

      // Brand new dashboards are defaulted to edit mode, existing ones default to view mode.
      const defaultMode =
        $route.current.params[DashboardConstants.VIEW_MODE_PARAM] ||
        (dash.id ? DashboardViewMode.VIEW : DashboardViewMode.EDIT);

      const stateDefaults = {
        title: dash.title,
        panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
        options: dash.optionsJSON ? JSON.parse(dash.optionsJSON) : {},
        uiState: dash.uiStateJSON ? JSON.parse(dash.uiStateJSON) : {},
        query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || { query_string: { query: '*' } },
        filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter),
        viewMode: defaultMode
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
      const queryMismatch = () => !_.isEqual($state.query, savedDashQuery);
      const filterBarMismatch = () =>
        !_.isEqual(cleanFiltersForComparison($state.filters), cleanFiltersForComparison(savedDashFilters));

      const timeMismatch = () => dash.timeRestore && (savedDashTimeFrom !== timefilter.time.from || savedDashTimeTo !== timefilter.time.to);

      const changeViewMode = (newMode) => {

        const changedFilters = [];
        if (filterBarMismatch()) { changedFilters.push('filter'); }
        if (queryMismatch()) { changedFilters.push('query'); }
        if (timeMismatch()) { changedFilters.push('time range'); }

        const isPlural = changedFilters.length > 1;
        const lastEntry = isPlural ? `, and ${changedFilters[changedFilters.length - 1]}` : '';
        if (isPlural) changedFilters.splice(-1, 1);
        const changedFilterList = `${changedFilters.join(', ')}${lastEntry}`;

        const unsavedFilterListMessage = changedFilterList ? `, including changes to your ${changedFilterList}` : '';

        // Time changes don't propagate to stateMonitor so we must track that dirty state manually.
        if (($appStatus.dirty || (dash.timeRestore && timeMismatch())) &&
          // Don't warn if loading the dashboard for the first time.
          newMode === DashboardViewMode.VIEW && $state.viewMode === DashboardViewMode.EDIT) {

          const exitEditMode = () => {
            if (dash.id) {
              kbnUrl.change('/dashboard/{{id}}', { id: dash.id });
            } else {
              kbnUrl.change(`/dashboard?${DashboardConstants.VIEW_MODE_PARAM}=${newMode}`);
            }
          };

          const saveAndExitEditMode = () => $scope.save().then(exitEditMode);

          confirmModal(
            `You have unsaved changes${unsavedFilterListMessage}. You can save them or exit without saving and lose your changes.`,
            {
              onConfirm: saveAndExitEditMode,
              onCancel: exitEditMode,
              onClose: _.noop,
              confirmButtonText: 'Save dashboard',
              cancelButtonText: 'Lose changes',
              title: 'Unsaved changes'
            });
          return;
        }

        const doModeSwitch = () => {
          $scope.dashboardViewMode = $state.viewMode = newMode;
          $scope.topNavMenu = getTopNavConfig(newMode, kbnUrl, changeViewMode);
          if (newMode === DashboardViewMode.EDIT) {
            // We don't want a difference in view mode to trigger the dirty state.
            stateDefaults.viewMode = $state.viewMode;
            stateMonitor = stateMonitorFactory.create($state, stateDefaults);
            stateMonitor.onChange(status => {
              $appStatus.dirty = status.dirty;
            });
          }

          $state.save();
        };

        if (newMode === DashboardViewMode.EDIT && dash.id && changedFilterList.length > 0) {
          const onLoadSavedFilters = () => {
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
            doModeSwitch();
          };

          const thoseOrThat = isPlural ? 'those' : 'that';
          const isOrAre = isPlural ? 'are' : 'is';
          confirmModal(
            `Your current ${changedFilterList} ${isOrAre} different than ${thoseOrThat} stored with your dashboard.`,
            {
              onConfirm: onLoadSavedFilters,
              onCancel: () => { doModeSwitch(); $appStatus.dirty = true; },
              onClose: _.noop,
              confirmButtonText: 'Load dashboard defaults',
              cancelButtonText: 'Use current values',
              title: 'Conflict detected'
            });
        } else {
          doModeSwitch();
        }
      };

      changeViewMode($state.viewMode);

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
        const displayTitle = dash.lastSavedTitle || `${dash.title} (unsaved)`;
        const isEditMode = $state.viewMode === DashboardViewMode.EDIT;
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
        return !$scope.state.panels.length && $state.viewMode === DashboardViewMode.EDIT;
      };

      $scope.showViewHelpText = () => {
        return !$scope.state.panels.length && $state.viewMode === DashboardViewMode.VIEW;
      };
    }
  };
});
