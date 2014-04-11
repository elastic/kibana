define(function (require) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('filters/start_from');

  var navHtml = require('text!../partials/nav.html');

  // Grab the html and controllers for each section
  var sections = {
    indices: require('text!../partials/indices.html'),
  };

  // Order them correctly in the nav
  var sectionList = ['indices'];

  var template = function (params) {
    return '' +
        '<div ng-controller="settings">' +
          //navHtml +
          sections[params] +
        '</div>';
  };

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  })
  .when('/settings/indices', {
    template: template('indices'),
    reloadOnSearch: false
  })
  .when('/settings/indices/:id?', {
    template: template('indices'),
    reloadOnSearch: false
  });


  app.controller('settings', function ($scope, configFile, courier, createNotifier, $route, $routeParams, $location, es) {

    var notify = createNotifier({
      location: 'Index Settings'
    });

    var init = function () {
      $scope.getPatterns();
      $scope.indices = {
        id: $routeParams.id,
        table: {
          by: 'field',
          reverse: false,
          page: 0,
          max: 20
        }
      };
      console.log($scope.indices);

      if (!!$scope.indices.id) {
        loadPattern($scope.indices.id);
      }
    };

    var loadPattern = function (pattern) {
      es.get({
        index: configFile.kibanaIndex,
        type: 'mapping',
        id: pattern
      })
      .then(function (resp) {
        $scope.indices.mapping = _.map(resp._source, function (v, k) {
          return {field: k, mapping: v};
        });
      })
      .catch(function (err) {
        $location.path('/settings/indices');
      });
    };

    $scope.getPatterns = function (pattern) {
      var source = courier.createSource('search').index(configFile.kibanaIndex).type('mapping');
      source.query({match_all: {}})
        .fetch()
        .then(function (resp) {
          $scope.indices.patterns = _.map(resp.hits.hits, function (hit) {
            return hit._id;
          });
        });
      source.destroy();
    };

    $scope.refreshFields = function (pattern) {
      var source = courier.createSource('search').index(pattern);
      var mapping = source.clearFieldCache().then(function () {
        $scope.addPattern(pattern);
      });
    };

    $scope.removePattern = function (pattern) {
      es.delete({
        index: configFile.kibanaIndex,
        type: 'mapping',
        id: pattern
      })
      .then(function (resp) {
        es.indices.refresh({index: configFile.kibanaIndex})
        .then(function () {
          $location.path('/settings/indices');
        });
      })
      .catch(function (err) {
        $location.path('/settings/indices');
      });
    };

    $scope.addPattern = function (pattern) {
      console.log('adding');
      var source = courier.createSource('search').index(pattern);
      var mapping = source.getFields();
      mapping.then(function (mapping) {
        es.indices.refresh({index: configFile.kibanaIndex})
        .then(function () {
          $location.path('/settings/indices/' + pattern);
          source.destroy();
        });
      })
      .catch(function (err) {
        if (err.status >= 400) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
      });
    };

    $scope.setFieldSort = function (by) {
      if ($scope.indices.table.by === by) {
        $scope.indices.table.reverse = !$scope.indices.table.reverse;
      } else {
        $scope.indices.table.by = by;
      }
    };

    $scope.sortClass = function (column) {
      if ($scope.indices.table.by !== column) return;
      return $scope.indices.table.reverse ? ['fa', 'fa-sort-asc'] : ['fa', 'fa-sort-desc'];
    };

    $scope.tablePages = function () {
      if (!$scope.indices.mapping) return 0;
      return Math.ceil($scope.indices.mapping.length / $scope.indices.table.max);
    };

    init();

    $scope.$emit('application.load');
  });


});