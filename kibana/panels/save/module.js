/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
  var angular = require('angular');  
  var app = require('app');
  var _ = require('lodash');
  var save = require('./lib/save');

  var module = angular.module('kibana.panels.marvel.save', []);
  app.useModule(module);

  module.controller('marvel.reset', function ($scope, dashboard, $routeParams, $location, $timeout) {
    $scope.reset = function () {
      var link = dashboard.current.base.link;
      dashboard.elasticsearch_delete($routeParams.kbnId).then(function () {
        // Add an artificial wait for the index to update so when the page reloads
        // it doesn't try and redirect to the saved dashboard.
        $timeout(function () {
          $location.path(link);
        }, 1000);
      });
    };

    $scope.init = function () {
      $scope.saved = (($routeParams.kbnType === 'elasticsearch') && dashboard.current.base);
    };
  });

  module.controller('marvel.save', function ($scope, dashboard, kbnVersion, $routeParams, alertSrv, $location,  $http) {

    $scope.panelMeta = {
      status: 'Stable',
      description: 'A simple panel for saving a Marvel dashboard'
    };

    $scope.panel = {
    };


    $scope.save = function () {
      if ($routeParams.kbnType !== 'script') {
        save($http, dashboard).then(function (result) {
          $location.path('/dashboard/elasticsearch/'+result._id);
          if(!_.isUndefined(result._id)) {
            alertSrv.set('Dashboard Saved','This dashboard has been saved to Elasticsearch as "' +
                         result._id + '"','success',5000);
          } else {
            alertSrv.set('Save failed','Dashboard could not be saved to Elasticsearch','error',5000);
          }
        });
      }
    };


    $scope.init = function () {
      
      // We need to set a way to track the original source of the dashboard
      var isFile = ( $routeParams.kbnType === 'file' );
      var isMarvel = /^marvel.+$/.test($routeParams.kbnId);

      // Only add the base object if the dashboard is loaded from the file 
      // and the current dashboard is a marvel dashboard.
      if (isFile  && isMarvel) {
        dashboard.current.base = {
          id: $routeParams.kbnId,
          version: kbnVersion,
          link: $location.path()
        };
      }

      if (!isFile && dashboard.current.base) {
        $scope.saved = true;
      }

      // TODO: WE need to discuse our strategy for upgrades to Marvel. Are we
      // gonna reset their saved dashboards? Or do we leave them in tact?
      // if (dashboard.current.base.version !== kbnVersion) {
      //   dashboard.purge_default();
      //   dashboard.elasticsearch_delete($routeParams.kbnId);
      // }
    };

  });
  
});
