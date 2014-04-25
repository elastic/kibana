define(function (require) {
  'use strict';
  var config = require('config');
  var _ = require('lodash');
  var getState = require('lib/ClusterState/getState');
  var getIndices = require('lib/ClusterState/getIndices');
  var refreshState = require('lib/ClusterState/refreshState');
  var explainStatus = require('lib/ClusterState/explainStatus');
  var groupIndicesByState = require('lib/ClusterState/groupIndicesByState');

  return function (module) {

    module.factory('$clusterState', function ($rootScope, $http, kbnIndex, dashboard) {

      // Create a partial function for the client.
      var client = _.partial(getState, $http, config);
      var indices = _.partial(getIndices, kbnIndex, dashboard);

      // Create an isolated scope that we will return as the service object.
      // Also instantiate the state and version.
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

      // Attach the groupIndicesByState method
      service.groupIndicesByState = groupIndicesByState.bind(null, service);

      // Return the service to the subscribers.
      return service;

    });
  };
});
