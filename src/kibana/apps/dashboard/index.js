define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('css!./styles/main.css');
  require('directives/config');
  require('courier/courier');
  require('config/config');
  require('apps/dashboard/directives/grid');
  require('apps/dashboard/directives/panel');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/services'
  ]);

  require('routes')
  .when('/dashboard', {
    templateUrl: 'kibana/apps/dashboard/index.html'
  })
  .when('/dashboard/:source', {
    redirectTo: '/dashboard'
  })
  .when('/dashboard/:source/:path', {
    templateUrl: 'kibana/apps/dashboard/index.html'
  })
  .when('/dashboard/:source/:path/:params', {
    templateUrl: 'kibana/apps/dashboard/index.html'
  });

  app.controller('dashboard', function ($scope, $routeParams, $rootScope, $location, courier, configFile) {
    $scope.routeParams = $routeParams;

    $scope.$watch('routeParams.path', function (newVal) {
      if ($routeParams.source === 'elasticsearch') {
        getDashboardFromElasticsearch(newVal);
      }
    });

    $scope.$watch('configurable.input.search', function (newVal) {
      dashboardSearch(newVal);
    });

    $scope.editingTitle = false;

    // Passed in the grid attr to the directive so we can access the directive's function from
    // the controller and view
    $scope.gridControl = {};

    // This must be setup to pass to $scope.configurable, even if we will overwrite it immediately
    $scope.dashboard = {
      title: 'New Dashboard',
      panels: []
    };

    // All inputs go here.
    $scope.input = {
      search: ''
    };

    // Setup configurable values for config directive, after objects are initialized
    $scope.configurable = {
      dashboard: $scope.dashboard,
      load: $scope.load,
      input: {
        search: $scope.input.search
      }
    };

    $rootScope.$broadcast('application.load');

    var dashboardSearch = function (query) {
      var search;

      if (_.isString(query) && query.length > 0) {
        query = {match: {title: {query: query, type: 'phrase_prefix'}}};
      } else {
        query = {match_all: {}};
      }

      search = courier.createSource('search')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .size(10)
        .query(query)
        .inherits(courier.rootSearchSource);

      search.onResults().then(function onResults(res) {
        $scope.configurable.searchResults = res.hits.hits;
        search.onResults().then(onResults);
      });
    };

    var setConfigTemplate = function (template) {
      // Close if already open
      if ($scope.configTemplate === template) {
        delete $scope.configTemplate;
        return;
      } else {
        $scope.configTemplate = template;
      }
    };

    $scope.openSave = function () {
      setConfigTemplate(require('text!./partials/save_dashboard.html'));

      $scope.configSubmit = function () {
        $scope.save($scope.dashboard.title);
      };
    };

    $scope.openLoad = function () {
      setConfigTemplate(require('text!./partials/load_dashboard.html'));

      if ($scope.configTemplate) dashboardSearch($scope.configurable.input.search);
    };

    $scope.save = function (title) {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id(title);

      doc.doIndex({title: title, panels: $scope.gridControl.serializeGrid()})
        .then(function (res, err) {
          if (_.isUndefined(err)) {
            $location.url('/dashboard/elasticsearch/' + encodeURIComponent(title));
            if (!$scope.$$phase) $scope.$apply();
          }
          else {
            // TODO: Succcess/failure notifications
            throw new Error(err);
          }
        });

      doc.doIndex({title: title, panels: $scope.gridControl.serializeGrid()}, function (err) {

      });
    };

    $scope.load = function (schema) {
      _.assign($scope.dashboard, schema);
      $scope.gridControl.clearGrid();
      $scope.gridControl.unserializeGrid($scope.dashboard.panels);
    };

    var getDashboardFromElasticsearch = function (title) {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id(title)
        .on('results', function (doc) {
          // TODO: Handle missing docs
          if (!doc.found) console.log('Dashboard not found');

          $scope.load(doc._source);
        });
      courier.fetch();
    };

  });
});