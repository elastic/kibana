define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var ConfigTemplate = require('utils/config_template');

  require('directives/config');
  require('components/courier/courier');
  require('components/config/config');
  require('components/notify/notify');
  require('components/typeahead/typeahead');
  require('components/clipboard/clipboard');


  require('plugins/dashboard/directives/grid');
  require('plugins/dashboard/directives/panel');
  require('plugins/dashboard/services/saved_dashboards');
  require('css!plugins/dashboard/styles/main.css');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/typeahead'
  ]);

  require('routes')
  .when('/dashboard', {
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : '/dashboard'
        }));
      }
    }
  });

  app.directive('dashboardApp', function (Notifier, courier, savedVisualizations, AppState, timefilter, kbnUrl) {
    return {
      controller: function ($scope, $route, $routeParams, $location, configFile, Private) {
        var notify = new Notifier({
          location: 'Dashboard'
        });

        var dash = $scope.dash = $route.current.locals.dash;
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
          save: require('text!plugins/dashboard/partials/save_dashboard.html'),
          load: require('text!plugins/dashboard/partials/load_dashboard.html'),
          share: require('text!plugins/dashboard/partials/share.html'),
          pickVis: require('text!plugins/dashboard/partials/pick_visualization.html')
        });

        $scope.openSave = _.partial($scope.configTemplate.toggle, 'save');
        $scope.openShare = _.partial($scope.configTemplate.toggle, 'share');
        $scope.openLoad = _.partial($scope.configTemplate.toggle, 'load');
        $scope.openAdd = _.partial($scope.configTemplate.toggle, 'pickVis');
        $scope.refresh = _.bindKey(courier, 'fetch');

        timefilter.enabled = true;
        $scope.timefilter = timefilter;
        $scope.$listen(timefilter, 'update', $scope.refresh);

        courier.setRootSearchSource(dash.searchSource);

        function init() {
          updateQueryOnRootSource();

          var docTitle = Private(require('components/doc_title/doc_title'));
          if (dash.id) {
            docTitle.change(dash.title);
          }

          $scope.$emit('application.load');
        }

        function updateQueryOnRootSource() {
          var filters = $state.filters;
          if ($state.query) {
            dash.searchSource.set('filter', _.union($state.filters, [{
              query:  $state.query
            }]));
          } else {
            dash.searchSource.set('filter', filters);
          }
        }

        $scope.$watch('state.filters', function () {
          $scope.filterResults();
        });

        $scope.newDashboard = function () {
          kbnUrl.change('/dashboard', {});
        };

        $scope.filterResults = function () {
          updateQueryOnRootSource();
          $state.save();
          courier.fetch();
        };

        $scope.save = function () {
          $state.title = dash.id = dash.title;
          $state.save();
          dash.panelsJSON = JSON.stringify($state.panels);

          dash.save()
          .then(function () {
            notify.info('Saved Dashboard as "' + dash.title + '"');
            if (dash.id !== $routeParams.id) {
              kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
            }
          })
          .catch(notify.fatal);
        };

        var pendingVis = _.size($state.panels);
        $scope.$on('ready:vis', function () {
          if (pendingVis) pendingVis--;
          if (pendingVis === 0) {
            $state.save();
            courier.fetch();
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
          $state.panels.push({ visId: hit.id });
        };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          save: $scope.save,
          addVis: $scope.addVis,
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

  var apps = require('registry/apps');
  apps.register(function DashboardAppModule() {
    return {
      id: 'dashboard',
      name: 'Dashboard',
      order: 2
    };
  });
});
