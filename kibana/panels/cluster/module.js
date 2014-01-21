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
  'underscore',
  'kbn'
],
function (angular, app, _, kbn) {
  'use strict';

  var module = angular.module('kibana.panels.marvel.cluster', []);
  app.useModule(module);

  module.controller('marvel.cluster', function($scope, $modal, $q, $cookies, $http,
    querySrv, dashboard, filterSrv, kbnVersion) {
    $scope.panelMeta = {
      modals : [],
      editorTabs : [],
      status: "Experimental",
      description: "A simple view of cluster health<p>"
    };

    // Set and populate defaults
    var _d = {
      title: 'Cluster Status',
    };
    _.defaults($scope.panel,_d);

    var reportInterval = 86400000;
    //var reportInterval = 30000;

    $scope.init = function () {
      // So we can access the cookies object from the view
      $scope.cookies = $cookies;
      $scope.kbnVersion = kbnVersion;

      // If the user hasn't opted in or out, ask them to.
      if(_.isUndefined($cookies.marvelOptIn) || $cookies.marvelVersion !== kbnVersion) {
        $scope.optInModal();
      }

      $scope.$on('refresh',function(){$scope.get_data();});
      $scope.get_data();
    };

    $scope.get_data = function(segment,query_id) {
      var
        request,
        _segment;

      $scope.panel.error =  false;

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
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
      request.doSearch().then(function(results) {
        $scope.panelMeta.loading = false;

        if(_segment === 0) {
          $scope.data = undefined;
          query_id = $scope.query_id = new Date().getTime();
        }

        // Check for error and abort if found
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error);
          return;
        // Are we still on the same query? No? Abort.
        } else if ($scope.query_id !== query_id) {
          return;
        }

        $scope.data = _.isArray(results.hits.hits) ? results.hits.hits[0]._source : undefined;

        if(checkReport()) {
          sendReport($scope.data);
        }

        // Did we find anything in that index? No? Try the next one.
        if (_.isUndefined($scope.data) && _segment+1 < dashboard.indices.length) {
          $scope.get_data(_segment+1,$scope.query_id);
        }

      });
    };

    $scope.healthClass = function(color,ignoreGreen) {
      switch(color)
      {
      case 'green':
        return ignoreGreen ? '':'text-success';
      case 'yellow':
        return 'text-warning';
      case 'red':
        return 'text-error';
      default:
        return '';
      }
    };

    $scope.populate_modal = function(request) {
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };

    $scope.setOptIn = function(c) {
      $cookies.marvelVersion = kbnVersion;
      $cookies.marvelOptIn = c;
    };

    $scope.clearMarvelCookies = function() {
      delete $cookies.marvelOptIn;
      delete $cookies.marvelVersion;
      delete $cookies.marvelLastReport;
    };

    $scope.optInModal = function() {
      var panelModal = $modal({
        template: './app/panels/marvel/cluster/optin.html',
        persist: true,
        show: false,
        scope: $scope,
        keyboard: false
      });

      // and show it
      $q.when(panelModal).then(function(modalEl) {
        modalEl.modal('show');
      });
    };

    // Checks if we should send a report
    var checkReport = function() {
      if($cookies.marvelOptIn === 'IN') {
        if(_.isUndefined($cookies.marvelLastReport)) {
          return true;
        } else if (new Date().getTime() - parseInt($cookies.marvelLastReport,10) > reportInterval) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    };

    var sendReport = function(data) {
      if (!$scope.config.stats_report_url) {
        return;
      }

      var thisReport = new Date().getTime().toString();

      // TODO: Replace this URL with the actual data sink
      $http.post(
        $scope.config.stats_report_url,
        data
      ).success(function() {
        $cookies.marvelLastReport = thisReport;
      });
    };

  });

  module.filter('formatBytes', function(){
    return function(value) {
      if(_.isUndefined(value)) {
        return '';
      }
      return kbn.byteFormat(value);
    };
  });

  module.filter('formatShort', function(){
    return function(value, decimals) {
      if(_.isUndefined(value)) {
        return '';
      }
      return kbn.shortFormat(value, decimals);
    };
  });

  module.filter('formatNumber', function(){
    return function(value, decimals) {
      if(_.isUndefined(value)) {
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
      } else if (value < 24 * 3600) {
        value /= 3600;
        suffix = ' h';
      } else {
        value /= 24 * 3600;
        suffix = ' d';
      }
      return value.toFixed(decimals) + suffix;
    };
  });


});