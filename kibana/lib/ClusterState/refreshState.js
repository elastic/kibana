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



define(function () {
  'use strict';

  return function refreshState(service, getState, getIndices) {
    return getIndices().then(function (indices) {
      var success = function (state) {
        // Check the state is valid and emit an update event
        if (state && state['@timestamp'] !== service.version) {
          service.state = state;
          service.version = state['@timestamp'];
          service.$emit('update', state);
        }
        return state;
      };

      var error = function (err) {
        service.$emit('error', err);
        return err;
      };

      // Get the state... when we get a new version we need to emit an update
      return getState(indices).then(success, error);
    });
  };
    
});
