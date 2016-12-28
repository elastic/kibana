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
import { createPanelState } from 'plugins/kibana/dashboard/components/panel/lib/panel_state';
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

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl) {
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

      let stateMonitor;
      const $state = $scope.state = new AppState(stateDefaults);
      const $uiState = $scope.uiState = $state.makeStateful('uiState');
      const $appStatus = $scope.appStatus = this.appStatus = {};

      $scope.$watchCollection('state.options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) $state.save();
      });

      $scope.$watch('state.options.darkTheme', setDarkTheme);

      $scope.topNavMenu = [{
        key: 'new',
        description: 'New Dashboard',
        run: function () { kbnUrl.change('/dashboard', {}); },
        testId: 'dashboardNewButton',
      }, {
        key: 'add',
        description: 'Add a panel to the dashboard',
        template: require('plugins/kibana/dashboard/partials/pick_visualization.html'),
        testId: 'dashboardAddPanelButton',
      }, {
        key: 'save',
        description: 'Save Dashboard',
        template: require('plugins/kibana/dashboard/partials/save_dashboard.html'),
        testId: 'dashboardSaveButton',
      }, {
        key: 'open',
        description: 'Open Saved Dashboard',
        template: require('plugins/kibana/dashboard/partials/load_dashboard.html'),
        testId: 'dashboardOpenButton',
      }, {
        key: 'share',
        description: 'Share Dashboard',
        template: require('plugins/kibana/dashboard/partials/share.html'),
        testId: 'dashboardShareButton',
      }, {
        key: 'options',
        description: 'Options',
        template: require('plugins/kibana/dashboard/partials/options.html'),
        testId: 'dashboardOptionsButton',
      }];

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
          $appStatus.dirty = status.dirty;
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

      $scope.expandedPanel = null;
      $scope.toggleExpandPanel = (panelIndex) => {
        if ($scope.expandedPanel && $scope.expandedPanel.panelIndex === panelIndex) {
          $scope.expandedPanel = null;
        } else {
          $scope.expandedPanel = $scope.state.panels.find(function (panel) {
            return panel.panelIndex === panelIndex;
          });
        }
      };

      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        updateQueryOnRootSource();
        $state.save();
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

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
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter
      };

      init();
    }
  };
});
