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
  var popFirstIndexAndReturnEndpoint = require('lib/ClusterState/popFirstIndexAndReturnEndpoint');

  return function getState($http, config, indices) {
    // WE need to throw and error if we ge this far. That means we don't have
    // any data for cluster state.
    if (indices.length === 0) {
      throw new Error('Cluster State could not be found');
    }

    // Generate the url for the request
    var url = config.elasticsearch+popFirstIndexAndReturnEndpoint(indices);
    // Get the newest cluster state from the index
    var body = { size: 1, sort: { '@timestamp': { order: 'desc' } } };

    // Send the request to Elasticsearch, if we find a cluster state return the
    // source. Otherwise we need to recursively call untill we find a valid state.
    var success = function (resp) {
      var state;
      if (resp.data.hits.total !== 0) {
        state = resp.data.hits.hits[0]._source;
        state._id = resp.data.hits.hits[0]._id;
        state._index = resp.data.hits.hits[0]._index;
        state._type = resp.data.hits.hits[0]._type;
        return state;
      } 
      return getState($http, config, indices);
    };

    var error = function () {
      return getState($http, config, indices);
    };

    return $http.post(url, body).then(success, error);
  };   

});
