export default function (api) {
  api.addEndpointDescription('_refresh', {
    methods: ['POST'],
    patterns: [
      "_refresh",
      "{indices}/_refresh"
    ],
  });

  api.addEndpointDescription('_rollover', {
    methods: ['POST'],
    patterns: [
      "{name}/_rollover",
      "{name}/_rollover/{name}"
    ],
    url_params: {
      wait_for_active_shards: "",
      dry_run: "__flag__"
    }
  });

  api.addEndpointDescription('_stats', {
    patterns: [
      "_stats",
      "_stats/{metrics}",
      "{indices}/_stats",
      "{indices}/_stats/{metrics}",
    ],
    url_components: {
      "metrics": [
        "docs",
        "store",
        "indexing",
        "search",
        "get",
        "merge",
        "refresh",
        "flush",
        "warmer",
        "filter_cache",
        "percolate",
        "segments",
        "fielddata",
        "completion",
        "translog",
        "query_cache",
        "commit",
        "_all"
      ]
    },
    url_params: {
      "fields": [],
      "types": [],
      "completion_fields": [],
      "docvalue_fields": [],
      "level": ["cluster", "indices", "shards"]
    }

  });

  api.addEndpointDescription('_segments', {
    patterns: [
      "{indices}/_segments",
      "_segments"
    ]
  });

  api.addEndpointDescription('_validate_query', {
    methods: ['GET', 'POST'],
    patterns: [
      "{indices}/_validate/query",
      "_validate/query"
    ],
    url_params: {
      explain: "__flag__",
      rewrite: "__flag__"
    },
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      }
    }
  });

  api.addEndpointDescription('_shard_stores', {
    methods: ['GET'],
    patterns: [
      "{indices}/_shard_stores",
      "_shard_stores"
    ],
    url_params: {
      status: ["green", "yellow", "red", "all"]
    }
  });

  api.addEndpointDescription('__create_index__', {
    methods: ['PUT'],
    patterns: [
      "{index}"
    ],

  });

  api.addEndpointDescription('_upgrade', {
    methods: ["POST"],
    patterns: [
      "_upgrade",
      "{indices}/_upgrade"
    ],
    url_params: {
      wait_for_completion: "__flag__"
    }
  });
}
