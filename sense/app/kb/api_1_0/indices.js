define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_refresh', {
      methods: ['POST']
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
          "id_cache",
          "percolate",
          "segments",
          "fielddata",
          "completion",
          "_all"
        ]
      },
      url_params: {
        "fields": [],
        "types": [],
        "completion_fields": [],
        "fielddata_fields": [],
        "level": ["cluster", "indices", "shards"]
      }

    });

    api.addEndpointDescription('_segments', {
      patterns: [
        "{indices}/_segments",
        "_segments"
      ]
    });

    api.addEndpointDescription('__create_index__', {
      methods: ['PUT'],
      patterns: [
        "{index}"
      ],
      data_autocomplete_rules: {
        mappings: {
          __scope_link: '_put_mapping'
        },
        settings: {
          __scope_link: '_put_settings.index'
        },
        aliases: {
          __template: {
            "NAME": {

            }
          }
        }
      }
    });

    api.addEndpointDescription('__delete_indices__', {
      methods: ['DELETE'],
      patterns: [
        "{indices}"
      ]
    });
  };

});
