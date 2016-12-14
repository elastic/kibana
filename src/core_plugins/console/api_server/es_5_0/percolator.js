module.exports = function (api) {
  api.addEndpointDescription('_put_percolator', {
    priority: 10, // to override doc
    methods: ['PUT', 'POST'],
    patterns: [
      "{index}/.percolator/{id}"
    ],
    url_params: {
      "version": 1,
      "version_type": ["external", "internal"],
      "op_type": ["create"],
      "routing": "",
      "parent": "",
      "timestamp": "",
      "ttl": "5m",
      "consistency": ["qurom", "one", "all"],
      "refresh": "__flag__",
      "timeout": "1m"
    },
    data_autocomplete_rules: {
      query: {}
    }
  });
  api.addEndpointDescription('_percolate', {
    methods: ['GET', 'POST'],
    priority: 10, // to override doc
    patterns: [
      "{indices}/{type}/_percolate"
    ],
    url_params: {
      preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
      routing: "",
      ignore_unavailable: ["true", "false"],
      percolate_format: ["ids"]
    },
    data_autocomplete_rules: {
      doc: {},
      query: {},
      filter: {},
      size: 10,
      track_scores: { __one_of: [true, false] },
      sort: "_score",
      aggs: {},
      highlight: {}
    }
  });
  api.addEndpointDescription('_percolate_id', {
    methods: ['GET', 'POST'],
    patterns: [
      "{indices}/{type}/{id}/_percolate"
    ],
    url_params: {
      routing: "",
      ignore_unavailable: ["true", "false"],
      percolate_format: ["ids"],
      percolate_index: "{index}",
      percolate_type: "{type}",
      percolate_routing: "",
      percolate_preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
      version: 1,
      version_type: ["external", "internal"]
    },
    data_autocomplete_rules: {
      query: {},
      filter: {},
      size: 10,
      track_scores: { __one_of: [true, false] },
      sort: "_score",
      aggs: {},
      highlight: {}
    }
  });
  api.addEndpointDescription('_percolate_count', {
    methods: ['GET', 'POST'],
    patterns: [
      "{indices}/{type}/_percolate/count"
    ],
    url_params: {
      preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
      routing: "",
      ignore_unavailable: ["true", "false"],
      percolate_format: ["ids"]
    },
    data_autocomplete_rules: {
      doc: {},
      query: {},
      filter: {}
    }
  });
};
