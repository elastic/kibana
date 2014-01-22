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

define([
  'angular',
  'app',
  'underscore',
],
function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.marvel.navigation', []);
  app.useModule(module);

  module.controller('marvel.navigation', function($scope, $http) {
    $scope.panelMeta = {
      status  : "Experimental",
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
      icon: "icon-globe",
    };

    _.defaults($scope.panel,_d);

    $scope.init = function() {
      if($scope.panel.source === 'panel') {
        $scope.links = $scope.panel.links;
      }

      if($scope.panel.source === 'url') {
        $http.get($scope.panel.url).then(function(response) {
          console.log(response);
          $scope.links = response.data.links;
        });
      }
    };

  });
});
