module.exports = function (api) {
  api.addEndpointDescription('_search', {
    methods: ['GET', 'POST'],
    priority: 10, // collides with get doc by id
    patterns: [
      "{indices}/{types}/_search",
      "{indices}/_search",
      "_search"
    ],
    url_params: {
      q: "",
      df: "",
      analyzer: "",
      default_operator: ["AND", "OR"],
      explain: "__flag__",
      _source: "",
      _source_include: "",
      _source_exclude: "",
      fields: [],
      sort: "",
      track_scores: "__flag__",
      timeout: 1,
      from: 0,
      size: 10,
      search_type: ["dfs_query_then_fetch", "dfs_query_and_fetch", "query_then_fetch", "query_and_fetch", "count", "scan"],
      terminate_after: 10,
      lowercase_expanded_terms: ["true", "false"],
      analyze_wildcard: "__flag__",
      preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
      scroll: "5m",
      scroll_id: "",
      routing: "",
      request_cache: ["true", "false"]
    },
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      },
      aggs: {
        __template: {
          "NAME": {
            "AGG_TYPE": {}
          }
        }
      },

      post_filter: {
        __scope_link: 'GLOBAL.filter'
      },
      size: {
        __template: 20
      },
      from: 0,
      sort: {
        __template: [
          {
            'FIELD': {
              'order': 'desc'
            }
          }
        ],
        __any_of: [
          {
            '{field}': {
              'order': {
                __one_of: ['desc', 'asc']
              },
              missing: {
                __one_of: ['_last', '_first']
              },
              mode: {
                __one_of: ['min', 'max', 'avg', 'sum']
              },
              nested_path: "",
              nested_filter: {
                __scope_link: "GLOBAL.filter"
              }
            }
          },
          '{field}',
          '_score',
          {
            '_geo_distance': {
              __template: {
                "FIELD": {
                  lat: 40,
                  lon: -70
                },
                order: "asc"
              },
              "{field}": {
                __one_of: [
                  {
                    __template: {
                      lat: 40,
                      lon: -70
                    },
                    lat: 40,
                    lon: -70
                  },
                  [
                    {
                      __template: {
                        lat: 40,
                        lon: -70
                      },
                      lat: 40,
                      lon: -70
                    }
                  ],
                  [""],
                  ""
                ]
              },
              distance_type: {__one_of: ["sloppy_arc", "arc", "plane"]},
              sort_mode: {__one_of: ["min", "max", "avg"]},
              order: {__one_of: ["asc", "desc"]},
              unit: "km"
            }
          }
        ]
      },
      fields: ['{field}'],
      fielddata_fields: ["{field}"],
      script_fields: {
        __template: {
          'FIELD': {
            'script': {
              // populated by a global rule
            }
          }
        },
        '*': {
          __scope_link: 'GLOBAL.script'
        }
      },
      partial_fields: {
        __template: {
          'NAME': {
            include: []
          }
        },
        '*': {
          include: [],
          exclude: []
        }
      },
      highlight: {
        // populated by a global rule
      },
      _source: {
        __one_of: [
          "{field}",
          ["{field}"],
          {
            "include": {
              __one_of: [
                "{field}",
                ["{field}"]
              ]
            },
            "exclude": {
              __one_of: [
                "{field}",
                ["{field}"]
              ]
            }
          }
        ]
      },
      explain: {
        __one_of: [true, false]
      },
      stats: [''],
      timeout: "1s",
      version: {__one_of: [true, false]}
    }
  });

  api.addEndpointDescription('_search_template', {
    methods: ['GET'],
    patterns: [
      "{indices}/{types}/_search/template",
      "{indices}/_search/template",
      "_search/template"
    ],
    data_autocomplete_rules: {
      "template": {
        __one_of: [
          {__scope_link: "_search"},
          {__scope_link: "GLOBAL.script"}
        ]
      },
      "params": {}
    }
  });

  api.addEndpointDescription('_render_search_template', {
    methods: ['GET'],
    patterns: [
      "_render/template"
    ],
    data_autocomplete_rules: {
      __one_of: [
        {"inline": {__scope_link: "_search"}},
        {__scope_link: "GLOBAL.script"}
      ],
      "params": {}
    }
  });

  api.addEndpointDescription('_render_search_template_with_id', {
    methods: ['GET'],
    patterns: [
      "_render/template/{id}"
    ],
    data_autocomplete_rules: {
      "params": {}
    }
  });

  api.addEndpointDescription('_get_delete_search_template', {
    methods: ['GET', 'DELETE'],
    patterns: [
      "_search/template/{id}"
    ]
  });

  api.addEndpointDescription('_put_search_template', {
    methods: ['PUT'],
    patterns: [
      "_search/template/{id}"
    ],
    data_autocomplete_rules: {
      "template": {
        __scope_link: "_search"
      }
    }
  });

  api.addEndpointDescription('_search_shards', {
    methods: ['GET'],
    priority: 10, // collides with get doc by id
    patterns: [
      "{indices}/{types}/_search_shards",
      "{indices}/_search_shards",
      "_search_shards"
    ],
    url_params: {
      preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
      routing: "",
      local: "__flag__"
    }
  });
};
