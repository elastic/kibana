define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('css!./styles/main.css');
  require('directives/config');
  require('courier/courier');
  require('config/config');
  require('notify/notify');

  require('./directives/grid');
  require('./directives/panel');
  require('./services/saved_dashboards');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
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

  app.controller('dashboard', function ($scope, $route, $routeParams, $rootScope, $location,
    Promise, es, configFile, createNotifier, courier) {

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
      search: void 0
    };

    // Setup configurable values for config directive, after objects are initialized
    $scope.configurable = {
      dashboard: dash,
      input: $scope.input
    };

    $scope.$on('$destroy', dash.destroy);

    $scope.$watch('dash.panelsJSON', function (val) {
      $scope.panels = JSON.parse(val || '[]');
    });

    var dashboardSearch = function (query) {
      if (query === void 0) return;

      if (_.isString(query) && query.length > 0) {
        query = {wildcard: {title: query + '*'}};
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
    $scope.$watch('configurable.input.search', dashboardSearch);

    var toggleConfigTemplate = function (name) {
      var html = configTemplates[name];
      // Close if already open
      $scope.configTemplate = ($scope.configTemplate === html) ? void 0 : html;
      return !!$scope.configTemplate;
    };

    $scope.openSave = function () {
      var open = toggleConfigTemplate('save');
      $scope.configSubmit = $scope.save;
    };

    $scope.openLoad = function () {
      var open = toggleConfigTemplate('load');
      if (open) {
        dashboardSearch($scope.input.search || '');
        $scope.configSubmit = null;
      }
    };

    $scope.save = function () {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id($scope.dash.title);

      // TODO: If a dashboard is deleted from kibana4-int, and we try to save another dashboard with
      // the same name later, it fails due to a version conflict.
      doc.doIndex({
        title: dash.title,
        panelsJSON: JSON.stringify($scope.gridControl.serializeGrid())
      })
      .then(function () {
        if ($scope.dash.title !== $routeParams.id) {
          $location.url('/dashboard/' + encodeURIComponent($scope.dash.title));
        }
      })
      .catch(notify.fatal);
    };

    $rootScope.$broadcast('application.load');
  });
});