module.exports = function (api) {
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
        "fielddata",
        "docs",
        "warmer",
        "percolate",
        "completion",
        "segments",
        "translog",
        "query_cache",
        "_all"
      ]
    }
  });
};
