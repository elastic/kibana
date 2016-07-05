import _ from 'lodash';
import $ from 'jquery';
import angular from 'angular';
import chrome from 'ui/chrome';
import 'ui/courier';
import 'ui/config';
import 'ui/notify';
import 'ui/typeahead';
import 'ui/navbar_extensions';
import 'ui/share';
import 'plugins/kibana/dashboard/directives/grid';
import 'plugins/kibana/dashboard/components/panel/panel';
import 'plugins/kibana/dashboard/services/saved_dashboards';
import 'plugins/kibana/dashboard/styles/main.less';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DefaultSettingsProvider from 'ui/settings/defaults';
import DocTitleProvider from 'ui/doc_title';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/dashboard/index.html';

require('ui/saved_objects/saved_object_registry').register(require('plugins/kibana/dashboard/services/saved_dashboard_register'));

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead'
]);

uiRoutes
  .when('/dashboard', {
    template: function ($location) {
      if ($location.new === true) {
        return indexTemplate;
      }

      return false;
    },
    resolve: {
      dash: function (savedDashboards, config, kbnUrl, Notifier, $location, $route) {
        let defaultDashboard = config.get('dashboard:defaultDashboard', '');

        let notify = new Notifier({
          location: 'Dashboard'
        });

        if ($location.search().new === true) {
          return savedDashboards.get();
        }

        function forceNew() {
          $location.search('new', true);
          $route.reload();
        }

        if (defaultDashboard !== '') {
          return savedDashboards.get(defaultDashboard)
            .then(function (result) {
              let dashboardUrl = savedDashboards.urlFor(result.id).substring(1);
              kbnUrl.change(dashboardUrl);
            })
            .catch(function (error) {
              notify.error(error);

              forceNew();
            });
        }

        forceNew();
      }
    }
  })
  .when('/dashboard/:id', {
    template: indexTemplate,
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier, kbnUrl) {
        if ($location.search().new === true) {
          kbnUrl.change('/dashboard');
          $location.search('new', true);
        }

        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : '/dashboard'
        }));
      }
    }
  });

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl) {
  return {
    controller: function ($scope, $rootScope, $route, $routeParams, $location, Private, getAppState, config) {

      const queryFilter = Private(FilterBarQueryFilterProvider);
      const configDefaults = Private(DefaultSettingsProvider);
      
      const notify = new Notifier({
        location: 'Dashboard'
      });

      const dash = $scope.dash = $route.current.locals.dash;

      if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
        timefilter.time.to = dash.timeTo;
        timefilter.time.from = dash.timeFrom;
      }

      $scope.$on('$destroy', dash.destroy);

      const configDefaultDashboard = config.get('dashboard:defaultDashboard', '');

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
        query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || {query_string: {query: '*'}},
        filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter),
      };

      const $state = $scope.state = new AppState(stateDefaults);
      const $uiState = $scope.uiState = $state.makeStateful('uiState');

      $scope.$watchCollection('state.options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) $state.save();
      });
      $scope.$watch('state.options.darkTheme', setDarkTheme);
      $scope.$watch('opts.isDefaultDashboard', toggleDefaultDashboard);

      $scope.topNavMenu = [{
        key: 'new',
        description: 'New Dashboard',
        run: function () { kbnUrl.change('/dashboard', {}); },
      }, {
        key: 'add',
        description: 'Add a panel to the dashboard',
        template: require('plugins/kibana/dashboard/partials/pick_visualization.html')
      }, {
        key: 'save',
        description: 'Save Dashboard',
        template: require('plugins/kibana/dashboard/partials/save_dashboard.html')
      }, {
        key: 'open',
        description: 'Load Saved Dashboard',
        template: require('plugins/kibana/dashboard/partials/load_dashboard.html')
      }, {
        key: 'share',
        description: 'Share Dashboard',
        template: require('plugins/kibana/dashboard/partials/share.html')
      }, {
        key: 'options',
        description: 'Options',
        template: require('plugins/kibana/dashboard/partials/options.html')
      }];

      $scope.refresh = _.bindKey(courier, 'fetch');

      timefilter.enabled = true;
      $scope.timefilter = timefilter;
      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      courier.setRootSearchSource(dash.searchSource);

      function init() {
        updateQueryOnRootSource();

        const docTitle = Private(DocTitleProvider);
        if (dash.id) {
          docTitle.change(dash.title);
        }

        initPanelIndices();
        $scope.$emit('application.load');
      }

      function initPanelIndices() {
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
        let index = $scope.state.panels.reduce(function (idx, panel) {
          // if panel is missing an index, add one and increment the index
          return Math.max(idx, panel.panelIndex || idx);
        }, 0);
        return ++index;
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
      
      // Returns whether this dashboard is now default
      function toggleDefaultDashboard(isChecked) {
        if (isChecked) {
          setDefaultDashboard(dash.id);
          return true;
        }

        if (dash.id === configDefaultDashboard) {
          /* If the default option is turned off and the previous default
           dashboard was this dashboard set no default dashboard */
          setDefaultDashboard(configDefaults['dashboard:defaultDashboard'].value);
          return false;
        }

        setDefaultDashboard(configDefaultDashboard);
        return false;
      }

      function setDefaultDashboard(id) {
        config.set('dashboard:defaultDashboard', id);
      }
      
      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        updateQueryOnRootSource();
        $state.save();
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

      $scope.newDashboard = function () {
        $location.search('new', true);
        $route.reload();
      };

      $scope.filterResults = function () {
        updateQueryOnRootSource();
        $state.save();
        $scope.refresh();
      };

      $scope.save = function () {
        $state.title = dash.id = dash.title;
        $state.save();

        dash.panelsJSON = angular.toJson($state.panels);
        dash.uiStateJSON = angular.toJson($uiState.getChanges());
        dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
        dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;
        dash.optionsJSON = angular.toJson($state.options);

        dash.save()
        .then(function (id) {
          $scope.kbnTopNav.close('save');
          if (id) {
            notify.info('Saved Dashboard as "' + dash.title + '"');
            if (dash.id !== $routeParams.id) {
              kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
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
        $state.panels.push({ id: hit.id, type: 'visualization', panelIndex: getMaxPanelIndex() });
      };

      $scope.addSearch = function (hit) {
        pendingVis++;
        $state.panels.push({ id: hit.id, type: 'search', panelIndex: getMaxPanelIndex() });
      };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          ui: $state.options,
          isDefaultDashboard: configDefaultDashboard === dash.id,
          save: $scope.save,
          addVis: $scope.addVis,
          addSearch: $scope.addSearch,
          timefilter: $scope.timefilter
        };

      init();
    }
  };
});
