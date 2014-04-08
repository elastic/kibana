define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('css!./styles/main.css');
  require('directives/config');
  require('courier/courier');
  require('config/config');

  require('./directives/grid');
  require('./directives/panel');
  require('./services/saved_dashboards');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/services'
  ]);

  var configTemplates = {
    save: require('text!./partials/save_dashboard.html'),
    load: require('text!./partials/load_dashboard.html')
  };

  require('routes')
  .when('/dashboard', {
    templateUrl: 'kibana/apps/dashboard/index.html',
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    templateUrl: 'kibana/apps/dashboard/index.html',
    resolve: {
      dash: function (savedDashboards, $route) {
        return savedDashboards.get($route.current.params.id);
      }
    }
  });

  app.controller('dashboard', function ($scope, $route, $routeParams, $rootScope, $location, Promise, es, configFile, createNotifier) {
    var notify = createNotifier({
      location: 'Dashboard'
    });

    var dash = $scope.dash = $route.current.locals.dash;

    $scope.editingTitle = false;

    // Passed in the grid attr to the directive so we can access the directive's function from
    // the controller and view
    $scope.gridControl = {};

    // All inputs go here.
    $scope.input = {
      search: ''
    };

    // Setup configurable values for config directive, after objects are initialized
    $scope.configurable = {
      dashboard: dash.details,
      input: $scope.input
    };

    $scope.$on('$destroy', _.bindKey(dash, 'cancelPending'));

    var dashboardSearch = function () {
      //ignore first run, just the watcher getting initialized

      dashboardSearch = function (query) {
        if (_.isString(query) && query.length > 0) {
          query = {match: {title: {query: query, type: 'phrase_prefix'}}};
        } else {
          query = {match_all: {}};
        }

        es.search({
          index: configFile.kibanaIndex,
          type: 'dashboard',
          size: 10,
          body: {
            query: query
          }
        })
        .then(function (res) {
          $scope.configurable.searchResults = res.hits.hits;
        });
      };
    };
    $scope.$watch('configurable.input.search', dashboardSearch);

    var toggleConfigTemplate = function (name) {
      var html = configTemplates[name];
      // Close if already open
      $scope.configTemplate = ($scope.configTemplate === html) ? null : html;
      return !!$scope.configTemplate;
    };

    $scope.openSave = function () {
      var open = toggleConfigTemplate('save');
      $scope.configSubmit = $scope.save;
    };

    $scope.openLoad = function () {
      var open = toggleConfigTemplate('load');
      if (open) {
        dashboardSearch($scope.configurable.input.search);
        $scope.configSubmit = null;
      }
    };

    $scope.save = function () {
      var wasUnsaved = dash.unsaved;
      dash.details.panels = $scope.gridControl.serializeGrid();

      return dash.save()
      .then(function (res) {
        if (wasUnsaved) $location.url('/dashboard/' + encodeURIComponent(dash.get('id')));
        return true;
      })
      .catch(notify.fatal);
    };

    $rootScope.$broadcast('application.load');
  });
});