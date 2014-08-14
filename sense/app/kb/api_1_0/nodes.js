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
  return function init(api) {
    api.addEndpointDescription('_nodes/hot_threads', {
      methods: ['GET'],
      patterns: [
        "_nodes/hot_threads",
        "_nodes/{nodes}/hot_threads"
      ]
    });
    api.addEndpointDescription('_nodes/info', {
      patterns: [
        "_nodes",
        "_nodes/{metrics}",
        "_nodes/{nodes}",
        "_nodes/{nodes}/{metrics}",
        "_nodes/{nodes}/info/{metrics}"
      ],
      url_components: {
        "metrics": [
          "settings",
          "os",
          "process",
          "jvm",
          "thread_pool",
          "network",
          "transport",
          "http",
          "plugins",
          "_all"
        ]
      }
    });
    api.addEndpointDescription('_nodes/stats', {
      patterns: [
        "_nodes/stats",
        "_nodes/stats/{metrics}",
        "_nodes/stats/{metrics}/{index_metric}",
        "_nodes/{nodes}/stats",
        "_nodes/{nodes}/stats/{metrics}",
        "_nodes/{nodes}/stats/{metrics}/{index_metric}"
      ],
      url_components: {
        "metrics": [
          "os",
          "jvm",
          "thread_pool",
          "network",
          "fs",
          "transport",
          "http",
          "indices",
          "process",
          "breaker",
          "_all"
        ],
        "index_metric": [
          "store",
          "indexing",
          "get",
          "search",
          "merge",
          "flush",
          "refresh",
          "filter_cache",
          "id_cache",
          "fielddata",
          "docs",
          "warmer",
          "percolate",
          "completion",
          "segments",
          "translog",
          "_all"
        ]
      }
    });
  };
});