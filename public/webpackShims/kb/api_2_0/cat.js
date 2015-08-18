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



define(["_"], function (_) {
  'use strict';


  function addSimpleCat(endpoint, api, params, patterns) {
    var url_params = { "help": "__flag__", "v": "__flag__", "bytes": ["b"]};
    _.each(params || [], function (p) {
      if (_.isString(p)) {
        url_params[p] = "__flag__";
      }
      else {
        var k = Object.keys(p)[0];
        url_params[k] = p[k];
      }
    });
    api.addEndpointDescription(endpoint, {
      match: endpoint,
      url_params: url_params,
      patterns: patterns || [endpoint]
    });
  }

  return function init(api) {
    addSimpleCat('_cat/aliases', api);
    addSimpleCat('_cat/allocation', api, null, ['_cat/allocation', '_cat/allocation/{nodes}']);
    addSimpleCat('_cat/count', api);
    addSimpleCat('_cat/health', api, [
      {"ts": ["false", "true"]}
    ]);
    addSimpleCat('_cat/indices', api, [
      {h: []},
      "pri",
    ],
      ['_cat/indices', '_cat/indices/{indices}']);
    addSimpleCat('_cat/master', api);
    addSimpleCat('_cat/nodes', api);
    addSimpleCat('_cat/pending_tasks', api);
    addSimpleCat('_cat/recovery', api);
    addSimpleCat('_cat/thread_pool', api);
    addSimpleCat('_cat/shards', api);
    addSimpleCat('_cat/plugins', api);
    addSimpleCat('_cat/segments', api);
  };
});
