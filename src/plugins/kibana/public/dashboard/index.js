define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var angular = require('angular');
  var ConfigTemplate = require('ui/ConfigTemplate');

  require('ui/directives/config');
  require('ui/courier');
  require('ui/config');
  require('ui/notify');
  require('ui/typeahead');
  require('ui/clipboard');

  require('plugins/kibana/dashboard/directives/grid');
  require('plugins/kibana/dashboard/components/panel/panel');
  require('plugins/kibana/dashboard/services/saved_dashboards');
  require('plugins/kibana/dashboard/styles/main.less');

  var app = require('ui/modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/typeahead'
  ]);

  require('ui/routes')
  .when('/dashboard', {
    template: require('plugins/kibana/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    template: require('plugins/kibana/dashboard/index.html'),
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
      controller: function ($scope, $route, $routeParams, $location, Private, getAppState) {
        var queryFilter = Private(require('ui/filter_bar/query_filter'));

        var notify = new Notifier({
          location: 'Dashboard'
        });

        var dash = $scope.dash = $route.current.locals.dash;

        if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
          timefilter.time.to = dash.timeTo;
          timefilter.time.from = dash.timeFrom;
        }

        $scope.$on('$destroy', dash.destroy);

        var matchQueryFilter = function (filter) {
          return filter.query && filter.query.query_string && !filter.meta;
        };

        var extractQueryFromFilters = function (filters) {
          var filter = _.find(filters, matchQueryFilter);
          if (filter) return filter.query;
        };

        var stateDefaults = {
          title: dash.title,
          panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
          query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || {query_string: {query: '*'}},
          filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter)
        };

        var $state = $scope.state = new AppState(stateDefaults);

        $scope.configTemplate = new ConfigTemplate({
          save: require('plugins/kibana/dashboard/partials/save_dashboard.html'),
          load: require('plugins/kibana/dashboard/partials/load_dashboard.html'),
          share: require('plugins/kibana/dashboard/partials/share.html'),
          pickVis: require('plugins/kibana/dashboard/partials/pick_visualization.html')
        });

        $scope.refresh = _.bindKey(courier, 'fetch');

        timefilter.enabled = true;
        $scope.timefilter = timefilter;
        $scope.$listen(timefilter, 'fetch', $scope.refresh);

        courier.setRootSearchSource(dash.searchSource);

        function init() {
          updateQueryOnRootSource();

          var docTitle = Private(require('ui/doc_title'));
          if (dash.id) {
            docTitle.change(dash.title);
          }

          $scope.$emit('application.load');
        }

        function updateQueryOnRootSource() {
          var filters = queryFilter.getFilters();
          if ($state.query) {
            dash.searchSource.set('filter', _.union(filters, [{
              query: $state.query
            }]));
          } else {
            dash.searchSource.set('filter', filters);
          }
        }

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
          $state.title = dash.id = dash.title;
          $state.save();
          dash.panelsJSON = angular.toJson($state.panels);
          dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
          dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;

          dash.save()
          .then(function (id) {
            $scope.configTemplate.close('save');
            if (id) {
              notify.info('Saved Dashboard as "' + dash.title + '"');
              if (dash.id !== $routeParams.id) {
                kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
              }
            }
          })
          .catch(notify.fatal);
        };

        var pendingVis = _.size($state.panels);
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
          $state.panels.push({ id: hit.id, type: 'visualization' });
        };

        $scope.addSearch = function (hit) {
          pendingVis++;
          $state.panels.push({ id: hit.id, type: 'search' });
        };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          save: $scope.save,
          addVis: $scope.addVis,
          addSearch: $scope.addSearch,
          shareData: function () {
            return {
              link: $location.absUrl(),
              // This sucks, but seems like the cleanest way. Uhg.
              embed: '<iframe src="' + $location.absUrl().replace('?', '?embed&') +
                '" height="600" width="800"></iframe>'
            };
          }
        };

        init();
      }
    };
  });
});
