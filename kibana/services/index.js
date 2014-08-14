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
  var config = require('config');
  var _ = require('lodash');
  var getState = require('lib/ClusterState/getState');
  var getIndices = require('lib/ClusterState/getIndices');
  var refreshState = require('lib/ClusterState/refreshState');
  var explainStatus = require('lib/ClusterState/explainStatus');
  var groupIndicesByState = require('lib/ClusterState/groupIndicesByState');
  var PhoneHome = require('../../../../common/PhoneHome');

  var module = angular.module('marvel.services', []);
  app.useModule(module);

  module.factory('$clusterState', function ($rootScope, $http, kbnIndex, dashboard) {

    // Create a parital function for the client.
    var client = _.partial(getState, $http, config);
    var indices = _.partial(getIndices, kbnIndex, dashboard);

    // Create an isolated scope that we will return as the service object.
    // Also initantiate the state and version.
    var service = $rootScope.$new(true);
    service.state = false;
    service.version = 0;

    // Create the refresh method so users can update the state manually.
    var refresh = _.partial(refreshState, service, client, indices);
    service.refresh = refresh;
    service.refresh();

    // Attach the refresh  operation to the refresh event.
    $rootScope.$on('refresh', service.refresh);

    // Attach the explainStatus method
    service.explainStatus = explainStatus.bind(null, service);

    service.groupIndicesByState = groupIndicesByState.bind(null, service);

    // Return the service to the subscribers.
    return service;

  });

  module.factory('$phoneHome', function ($http) {
    return new PhoneHome({
      client: $http,
      baseUrl: config.elasticsearch,
      index: config.kibana_index
    });
  });

  return module;

});
