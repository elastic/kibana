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
  'jquery',
  'lodash',
  './analytics',
  'factories/store'
],
function (angular, app, $, _, ga) {
  'use strict';

  var module = angular.module('kibana.panels.marvel.navigation', []);
  app.useModule(module);

  module.controller('marvel.navigation', function($scope, $http, storeFactory) {
    $scope.panelMeta = {
      status  : "Experimental",
      description : "A simple dropdown panel with a list of links"
    };

    // Check to see if the user is opted in to reporting
    var marvelOpts = storeFactory($scope, 'marvelOpts');

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

      if (marvelOpts.report) {
        ga('send', 'pageview', {
          cookieDomain: window.location.hostname,
          page: window.location.pathname+window.location.hash,
          location: window.location.href
        });
      }

      if($scope.panel.source === 'url') {
        $http.get($scope.panel.url).then(function(response) {
          var a = $('<a />');

          $scope.links = _.filter(response.data.links, function (link)  {
            a.attr("href", link.url);
            var current = window.location.href;
            // remove parameters
            current = current.replace(/\?.*$/,'');
            return a[0].href !== current;
          });
        });
      }
    };

  });
});
