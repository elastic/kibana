define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var ConfigTemplate = require('utils/config_template');

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
        query = {wildcard: {title: '*' + query + '*'}};
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

    $scope.configTemplate = new ConfigTemplate({
      save: require('text!./partials/save_dashboard.html'),
      load: require('text!./partials/load_dashboard.html')
    });

    $scope.openSave = function () {
      if ($scope.configTemplate.toggle('save')) {
        $scope.configSubmit = $scope.save;
      }
    };

    $scope.openLoad = function () {
      if ($scope.configTemplate.toggle('load')) {
        dashboardSearch($scope.input.search || '');
        $scope.configSubmit = null;
      }
    };

    $scope.save = function () {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id($scope.dash.title);

      doc.doIndex({
        title: dash.title,
        panelsJSON: JSON.stringify($scope.gridControl.serializeGrid())
      })
      .then(function () {
        notify.info('Saved Dashboard as "' + $scope.dash.title + '"');
        if ($scope.dash.title !== $routeParams.id) {
          $location.url('/dashboard/' + encodeURIComponent($scope.dash.title));
        }
      })
      .catch(notify.fatal);
    };

    $rootScope.$broadcast('application.load');
  });
});