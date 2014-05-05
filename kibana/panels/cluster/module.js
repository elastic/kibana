/** @scratch /panels/5
 * include::panels/cluster.asciidoc[]
 */

/** @scratch /panels/cluster/0
 * == cluster
 * Status: *Experimental*
 *
 * Displays a simple view of cluster health.
 *
 */
define([
    'angular',
    'app',
    'kbn',
    'lodash',
    'factories/store',
    'services/marvel/index'
  ],
  function (angular, app, kbn, _) {
    'use strict';

    var module = angular.module('kibana.panels.marvel.cluster', ['marvel.services']);
    app.useModule(module);

    module.controller('marvel.cluster', function ($scope, $modal, $q, $http, $clusterState, dashboard, filterSrv,
                                                  kbnVersion, cacheBust, $phoneHome) {
      $scope.panelMeta = {
        modals: [],
        editorTabs: [],
        status: "Stable",
        description: "A simple view of cluster health<p>"
      };

      // Set and populate defaults
      var _d = {
        title: 'Cluster Status',
      };
      _.defaults($scope.panel, _d);

      $scope.init = function () {
        $scope.kbnVersion = kbnVersion;

        $scope.$on('refresh', function () {
          $scope.get_data();
        });
        $clusterState.$on('update', $scope.updateHealthStatusData);
        $scope.updateHealthStatusData();
        $scope.get_data();
      };

      $scope.get_data = function (segment, query_id) {
        var
          request,
          _segment;

        $scope.panel.error = false;

        // Make sure we have everything for the request to complete
        if (dashboard.indices.length === 0) {
          return;
        }

        _segment = _.isUndefined(segment) ? 0 : segment;

        request = $scope.ejs.Request().indices(dashboard.indices[_segment]);

        request = request.query(
          $scope.ejs.FilteredQuery(
            $scope.ejs.QueryStringQuery('_type:cluster_stats'),
            filterSrv.getBoolFilter(filterSrv.ids)
          ))
          .size(1)
          .sort([$scope.ejs.Sort('@timestamp').order('desc')]);

        $scope.populate_modal(request);

        // Populate scope when we have results
        request.doSearch().then(function (results) {
          $scope.panelMeta.loading = false;

          if (_segment === 0) {
            $scope.data = undefined;
            query_id = $scope.query_id = new Date().getTime();
          }

          // Check for error and abort if found
          if (!(_.isUndefined(results.error))) {
            $scope.panel.error = $scope.parse_error(results.error);
            return;
            // Are we still on the same query? No? Abort.
          }
          else if ($scope.query_id !== query_id) {
            return;
          }

          $scope.data = _.isArray(results.hits.hits) ? results.hits.hits[0]._source : undefined;

          $phoneHome.set('data', $scope.data);

          // Did we find anything in that index? No? Try the next one.
          if (_.isUndefined($scope.data) && _segment + 1 < dashboard.indices.length) {
            $scope.get_data(_segment + 1, $scope.query_id);
          }

        });
      };

      $scope.healthClass = function (color, ignoreGreen) {
        switch (color) {
        case 'green':
          return ignoreGreen ? '' : 'text-success';
        case 'yellow':
          return 'text-warning';
        case 'red':
          return 'text-error';
        default:
          return '';
        }
      };

      $scope.populate_modal = function (request) {
        $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
      };


      $scope.updateHealthStatusData = function () {
        $scope.healthStatusData = {
          updatedForStatus: $clusterState.state.status,
          explainMessages: $clusterState.explainStatus()
        };
      };

    });

    module.filter('formatBytes', function () {
      return function (value) {
        if (_.isUndefined(value)) {
          return '';
        }
        return kbn.byteFormat(value);
      };
    });

    module.filter('formatShort', function () {
      return function (value, decimals) {
        if (_.isUndefined(value)) {
          return '';
        }
        return kbn.shortFormat(value, decimals);
      };
    });

    module.filter('formatNumber', function () {
      return function (value, decimals) {
        if (_.isUndefined(value)) {
          return '';
        }
        return value.toFixed(decimals);
      };
    });

    module.filter('formatTime', function () {
      return function (value, decimals) {
        if (_.isUndefined(value)) {
          return '';
        }
        value = value / 1000.0;
        var suffix = '';
        if (value < 3600) {
          value /= 60;
          suffix = ' m';
        }
        else if (value < 24 * 3600) {
          value /= 3600;
          suffix = ' h';
        }
        else {
          value /= 24 * 3600;
          suffix = ' d';
        }
        return value.toFixed(decimals) + suffix;
      };
    });


  });
