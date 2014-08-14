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
  var config = require('config');
  return function (client, ids) {
    var url = config.elasticsearch+'/'+config.kibana_index+'/dashboard/_mget';
    var body = {
      ids: ids
    };
    return client.post(url, body).then(function (resp) {
      return resp.data.docs.filter(function (row) {
        // Elasticsearch 0.9.x uses exists instead of found so we need to check
        // for that first to see if it exists. Otherwise use row.found.
        if (row.exists != null) {
          return row.exists;
        }
        return row.found;
      });
    });
  };
});
