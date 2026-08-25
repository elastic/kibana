/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LARGE_INPUT = `PUT myindex123

DELETE myindex123

PUT .kibana_test

PUT .alert_test

PUT .alerts_test

PUT myindex1234

PUT mytest

POST _aliases
{
  "actions": [
    {
      "add": {
        "index": "myindex1234",
        "alias": "myindex123"
      }
    }
  ]
}


# Versioned routes: Version 1 is deprecated
GET kbn:/api/routing_example/d/versioned?apiVersion=1
GET kbn:/api/routing_example/d/versioned?apiVersion=2

# Non-versioned routes
GET kbn:/api/routing_example/d/removed_route
POST kbn:/api/routing_example/d/migrated_route
{}

GET .kibana_usage_counters/_search
{
    "query": {
        "bool": {
            "should": [
              {"match": { "usage-counter.counterType": "deprecated_api_call:total"}},
              {"match": { "usage-counter.counterType": "deprecated_api_call:resolved"}},
              {"match": { "usage-counter.counterType": "deprecated_api_call:marked_as_resolved"}}
            ]
        }
    }
}

PUT myindexflat
{
    "mappings": {
        "properties": {
            "flat": {
                "type": "flattened"
            }
        }
    }
}

PUT myindexflat/_doc/123
{
    "flat": [{"test": 1},{"test": 2},{"another": 1}]
}

POST myindexflat/_search
{
  "fields": ["flat.test"],
  "_source": false
}

POST kbn:/api/endpoint/suggestions/eventFilters
{
  "query": "test",
  "field": "test"

}

GET .lists-default/_search?filter_path=hits


// Should contain results from hidden index
GET my_*/_search?filter_path=hits&expand_wildcards=all,hidden

// Should be empty
GET my_*/_search?filter_path=hits


GET .my*/_search?filter_path=hits
GET .my_hidden_index/_search?filter_path=hits
GET my_hidden_index/_search?filter_path=hits

PUT .my_hidden_index/_doc/1
{
  "SHOULD_NOT_BE_HERE": true
}

GET .my_sys_index
GET .my_hidden_index
GET _alias/.my_hidden_index

PUT /

# Creates a component template for mappings
PUT _component_template/my-mappings
{
  "template": {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date",
          "format": "date_optional_time||epoch_millis"
        },
        "message": {
          "type": "wildcard"
        }
      }
    }
  },
  "_meta": {
    "description": "Mappings for @timestamp and message fields",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}

# Creates a component template for index settings
PUT _component_template/my-settings
{
  "template": {
    "settings": {
      "index.lifecycle.name": "my-lifecycle-policy"
    }
  },
  "_meta": {
    "description": "Settings for ILM",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}


PUT _index_template/enterprise_search
{
  "index_patterns": ["logs-enterprise_search*", "logs-app_search.*", "logs-workplace_search.*"],
  "data_stream": { },
  "composed_of": [ "my-mappings", "my-settings" ],
  "priority": 500,
  "_meta": {
    "description": "Template for my time series data",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}

PUT _data_stream/logs-enterprise_search.whathaveyou
PUT _data_stream/logs-app_search.whathaveyou
PUT _data_stream/logs-workplace_search.whathaveyou

GET _migration/deprecations

POST my-data-stream/_doc
{
  "@timestamp": "2099-05-06T16:21:15.000Z",
  "message": """192.0.2.42 - - [06/May/2099:16:21:15 +0000] "GET /images/bg.jpg HTTP/1.0" 200 24736""",
  "object": {
    "this": "might work",
    "array": [{ "test": 1 }, { "test": 2 } ]
  }
}

GET my-data-stream/_search
{
  "runtime_mappings": {
    "object.array.test2": {
      "type": "long",
      "script": {
        "source": """
          if (params._source.object != null && params._source.object.array != null) {
            def arr = params._source.object.array;
            for (def entry : arr) {
                emit(entry.test + 10)
            }
            return;
          }
        """
      }
    },
    "messageV2": {
      "type": "text",
      "script": {
        "source": """
          if (params._source["messageV2"] != null) {
            // return what we have in source if there is something
            emit(params._source["messageV2"]);
          } else  {
            // return the original processed in some way
            emit(doc['message'].value + " the original, but processed");
          }
        """
      }
    }
  },
  "query": {
    "match_all": {}
  },
  "fields": ["messageV2", "object.array.test2"]
}

GET _index_template/my-index-template

GET _data_stream/my-data-strea

PUT _data_stream/my-data-stream-2
GET _data_stream/my-data-stream
GET _data_stream/my-data-stream-2

GET _data_stream/

GET .ds-my-data-stream-2025.08.13-000001/_mapping
PUT .ds-my-data-stream-2025.08.13-000001/_mapping
{
"_data_stream_timestamp": {
        "enabled": true
      },
      "properties": {
        "@timestamp": {
          "type": "date",
          "format": "date_optional_time||epoch_millis"
        },
        "message": {
          "type": "wildcard"
        },
        "messageV2": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "object": {
          "properties": {
            "array": {
              "properties": {
                "test": {
                  "type": "long"
                }
              }
            },
            "this": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            }
          }
        },
        "test": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        }
      }
    }

PUT _index_template/my-index-template
{
    "index_patterns": [
      "my-data-stream*"
    ],
    "composed_of": [
      "my-mappings",
      "my-settings"
    ],
    "priority": 500,
    "_meta": {
      "my-custom-meta-field": "More arbitrary metadata",
      "description": "Template for my time series data"
    },
    "data_stream": {
      "hidden": false,
      "allow_custom_routing": false
    }
  }\n\n`;
