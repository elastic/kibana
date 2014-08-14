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
  var config = require('config');
  var angular = require('angular');
  return function (client, dashboard) {
    var url = config.elasticsearch+'/'+config.kibana_index+'/dashboard/'+dashboard.current.base.id;
    var body = {
      user: 'guest',
      group: 'guest',
      title: dashboard.current.title,
      dashboard: angular.toJson(dashboard.current) 
    };
    return client.put(url, body).then(function (resp) {
      return resp.data;
    });
  };
});
