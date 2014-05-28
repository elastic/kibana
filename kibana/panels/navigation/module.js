/** @scratch /panels/5
 * include::panels/marvel.navigation.asciidoc[]
 */

/** @scratch /panels/marvel.navigation/0
 * == marvel.navigation
 * Status: *Experimental*
 *
 * This simple nav panel lives in the nav bar with the timepicker. It can be used to store a list of
 * links
 *
 */

define(function (require) {
  'use strict';

  var angular = require('angular');
  var app = require('app');
  var _ = require('lodash');

  var loadDashboards = require('./lib/loadDashboards');
  var extractIds = require('./lib/extractIds');
  var findDashboardById = require('./lib/findDashboardById');
  var parseDashboard = require('./lib/parseDashboard');
  var mergeLinksWithDashboards = require('./lib/mergeLinksWithDashboards');
  var filterLinks = require('./lib/filterLinks');

  require('factories/store');


  var module = angular.module('kibana.panels.marvel.navigation', []);
  app.useModule(module);

  module.controller('marvel.navigation', function($scope, $http, $q, dashboard, $location, $routeParams) {
    $scope.panelMeta = {
      status  : "Stable",
      description : "A simple dropdown panel with a list of links"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/marvel.navigation/5
       * === Parameters
       *
       * source:: 'panel' or 'url'.
       */
      source: 'panel',
      /** @scratch /panels/marvel.navigation/5
       * links:: An array containing link objects similar to the following example. Only used if
       * source is set to "panel"
       *
       * [source,javascript]
       * ----
       * {
       *   url: 'index.html#dashboard/file/mydashboard.json'
       *   name: 'Some route'
       * }
       * ----
       *
       */
      links: [],
      /** @scratch /panels/marvel.navigation/5
       * url:: File at URL should contain JSON in the same structure as the panel.links object.
       */
      url: undefined,
      /** @scratch /panels/marvel.navigation/5
       * icon:: A font-awesome icon to use for this list of links
       */
      icon: "icon-caret-down",
    };

    _.defaults($scope.panel,_d);




    $scope.init = function() {
      if($scope.panel.source === 'panel') {
        $scope.links = $scope.panel.links;
      }

      if($scope.panel.source === 'url') {

        $http.get($scope.panel.url).then(function (response) {
          var links = response.data.links;
          var ids = links.filter(extractIds).map(extractIds);
          loadDashboards($http, ids).then(function (dashboards) {

            // Parse all the dashboards so we can check their base.id
            dashboards = _.map(dashboards, parseDashboard);

            // If the route is file based and the location matches a saved dashboard, 
            // we need to redirect the browser to the saved dashboard.
            if ($routeParams.kbnType === 'file') {

              // Find out if there is an override for the the current dashboard.
              var overrideDashboard  = _.find(dashboards, findDashboardById($routeParams.kbnId));

              // Redirect the the override dashboard if it exists 
              if (overrideDashboard) {
                var path = '/dashboard/elasticsearch/'+overrideDashboard._id;
                $location.path(path);
                return;
              }
            }

            // Merge the links with the saved dashboards 
            links = _.map(links, mergeLinksWithDashboards(dashboards));

            // Filter the current dashboard out of the navigation links
            var current = window.location.href;
            current = current.replace(/\?.*$/,'');
            $scope.links = _.filter(links, filterLinks(current));

          });
        });
      }
    };

  });
});
