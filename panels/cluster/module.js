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

  module.controller('marvel.cluster', function($scope, $modal, $q, querySrv, dashboard, filterSrv) {
    $scope.panelMeta = {
      modals : [],
      editorTabs : [],
      status: "Experimental",
      description: "A simple view of cluster health<p>"
    };

    // Set and populate defaults
    var _d = {
      title: 'Cluster Status',
      optin: undefined,
    };
    _.defaults($scope.panel,_d);

    $scope.init = function () {
      // If the user hasn't opted in or out, ask them to.
      if(_.isUndefined($scope.panel.optin)) {
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

      console.log($scope.$id);

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
        console.log(results);
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

        // Did we find anything in that index? No? Try the next one.
        if (_.isUndefined($scope.data) && _segment+1 < dashboard.indices.length) {
          $scope.get_data(_segment+1,$scope.query_id);
        }

      });
    };

    $scope.healthClass = function(color) {
      switch(color)
      {
      case 'green':
        return 'text-success';
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
      $scope.panel.optin = c;
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

  });

  // WIP
  module.filter('marvelBytes', function(){
    return function(text) {
      if(_.isUndefined(text)) {
        return '';
      }
      return kbn.byteFormat(text);
    };
  });

});