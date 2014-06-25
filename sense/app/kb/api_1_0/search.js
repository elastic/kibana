define(function () {
  'use strict';

  return function init(api) {
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
        lowercase_expanded_terms: ["true", "false"],
        analyze_wildcard: "__flag__",
        preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
        scroll: "5m",
        scroll_id: "",
        routing: ""
      },
      data_autocomplete_rules: {
        query: {
          // populated by a global rule
        },
        facets: {
          __template: {
            'NAME': {
              'TYPE': {}
            }
          }
          // populated by a global rule
        },
        aggs: {
          __template: {
            "NAME": {
              "AGG_TYPE": {

              }
            }
          }
        },

        post_filter: {
          __scope_link: 'GLOBAL.filter'
        },
        size: {
          __template: 20
        },
        from: {},
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
                }
              }
            },
            '{field}',
            '_score'
          ]
        },
        search_type: {},
        fields: ['{field}'],
        script_fields: {
          __template: {
            'FIELD': {
              'script': ''
            }
          },
          '*': {
            __scope_link: 'GLOBAL.SCRIPT_ENV'
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
        explain: {
          __one_of: [true, false]
        },
        stats: [''],
        timeout: "1s"

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
        __scope_link: "_search"
      }
    });
  };

});
