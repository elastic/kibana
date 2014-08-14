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

    api.addEndpointDescription('_analyze', {
      methods: ['GET', 'POST'],
      patterns: [
        "{indices}/_analyze",
        "_analyze"
      ],
      url_params: {
        "analyzer": "",
        "char_filters": [],
        "field": "",
        "filters": [],
        "text": "",
        "tokenizer": ""
      }
    });

    api.addEndpointDescription('_validate_query', {
      methods: ['GET', 'POST'],
      patterns: [
        "{indices}/_validate/query",
        "_validate/query"
      ],
      url_params: {
        explain: "__flag__"
      },
      data_autocomplete_rules: {
        query: {
          // populated by a global rule
        }
      }
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
