define(function () {
  'use strict';
  var simple_metric = {
    __template: { field: ""},
    field: "{field}",
    script: "",
    params: {
    },
    lang: "mvel"
  }, field_metric = {
    __template: { field: ""},
    field: "{field}"
  };
  var rules = {
    "*": {
      "aggs": {
        __template: {
          "NAME": {
            "AGG_TYPE": {

            }
          }
        }
      },
      "min": simple_metric,
      "max": simple_metric,
      "avg": simple_metric,
      "stats": simple_metric,
      "extended_stats": simple_metric,
      "value_count": {
        __template: {
          "field": ""
        },
        "field": "{field}",
        "script": "_value",
        "params": {},
        "lang": "mvel"
      },
      "global": {},
      "filter": {},
      "missing": field_metric,
      "nested": {
        __template: {
          "path": ""
        },
        "path": ""
      },
      "reverse_nested": {
        __template: {
          "path": ""
        },
        "path": ""
      },
      "terms": {
        __template: {
          "field": "",
          "size": 10
        },
        "field": "{field}",
        "size": 10,
        "shard_size": 10,
        "order": {
          __template: {
            "_term": "asc"
          },
          "_term": { __one_of: ["asc", "desc"] },
          "_count": { __one_of: ["asc", "desc"] },
          "*": { __one_of: ["asc", "desc"] }
        },
        "min_doc_count": 10,
        "script": "_value",
        "params": {},
        "lang": "mvel",
        // TODO: these also support regex - extend!
        "include": "*",
        "exclude": "*",
        "execution_hint": { __one_of: ["map", "ordinals", "global_ordinals"] }
      },
      "significant_terms": {
        __template: {
          "field": ""
        },
        "field": "{field}",
        "size": 10,
        "shard_size": 10,
        "min_doc_count": 10,
        "include": "*",
        "exclude": "*",
        "execution_hint": { __one_of: ["map", "ordinals", "global_ordinals"] }
      },
      "range": {
        __template: {
          "field": "",
          "ranges": [
            { "from": 50, "to": 100 },
          ]
        },
        "field": "{field}",
        "ranges": [
          { "to": 50, "from": 100, "key": "" }
        ],
        "keyed": { __one_of: [true, false]},
        "script": "_value",
        "params": {},
        "lang": "mvel"
      },
      "date_range": {
        __template: {
          "field": "",
          "ranges": [
            { "from": "now-10d/d", "to": "now" },
          ]
        },
        "field": "{field}",
        "format": "MM-yyy",
        "ranges": [
          { "to": "", "from": "", "key": "" }
        ],
        "keyed": { __one_of: [true, false]},
        "script": "_value",
        "params": {},
        "lang": "mvel"
      },
      "ip_range": {
        __template: {
          "field": "",
          "ranges": [
            { "from": "10.0.0.5", "to": "10.0.0.10" },
          ]
        },
        "field": "{field}",
        "format": "MM-yyy",
        "ranges": [
          { "to": "", "from": "", "key": "", "mask": "10.0.0.127/25" }
        ],
        "keyed": { __one_of: [true, false]},
        "script": "_value",
        "params": {},
        "lang": "mvel"
      },
      "histogram": {
        __template: {
          "field": "price",
          "interval": 50
        },
        "field": "{field}",
        "interval": 50,
        "min_doc_count": 0,
        "order": {
          __template: {
            "_key": "asc"
          },
          "_key": { __one_of: ["asc", "desc"] },
          "_count": { __one_of: ["asc", "desc"] },
          "*": { __one_of: ["asc", "desc"] }
        },
        "keyed": { __one_of: [true, false]}

      },
      "date_histogram": {
        __template: {
          "field": "date",
          "interval": "month"
        },
        "field": "{field}",
        "interval": { __one_of: [ "year", "quarter", "week", "day", "hour", "minute", "second"]},
        "min_doc_count": 0,
        "order": {
          __template: {
            "_key": "asc"
          },
          "_key": { __one_of: ["asc", "desc"] },
          "_count": { __one_of: ["asc", "desc"] },
          "*": { __one_of: ["asc", "desc"] }
        },
        "keyed": { __one_of: [true, false]},
        "pre_zone": "-01:00",
        "post_zone": "-01:00",
        "pre_zone_adjust_large_interval": { __one_of: [true, false]},
        "factor": 1000,
        "pre_offset": "1d",
        "post_offset": "1d",
        "format": "yyyy-MM-dd",
        "time_zone": "00:00"
      },
      "geo_distance": {
        __template: {
          "field": "location",
          "origin": { "lat": 52.3760, "lon": 4.894 },
          "ranges": [
            { "from": 100, "to": 300 },
          ]
        },
        "field": "{field}",
        "origin": { "lat": 0.0, "lon": 0.0 },
        "unit": { __one_of: ["mi", "km", "in", "yd", "m", "cm", "mm"]},
        "ranges": [
          { "from": 50, "to": 100 }
        ],
        "distance_type": { __one_of: ["arc", "sloppy_arc", "plane"]}

      },
      "geohash_grid": {
        __template: {
          "field": "",
          "precision": 3
        },
        "field": "{field}",
        "precision": { __one_of: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
        "size": 10,
        "shard_size": 10
      },
      "percentiles": {
        __template: {
          "field": "",
          "percents": [1.0, 5.0, 25.0, 50.0, 75.0, 95.0, 99.0]
        },
        "field": "{field}",
        "percents": {
          __template: [1.0, 5.0, 25.0, 50.0, 75.0, 95.0, 99.0],
          // mark type as list
          __any_of: []
        },
        "script": "_value",
        "params": {},
        "lang": "mvel",
        "compression": 100
      },
      "cardinality": {
        __template: {
          "field": ""
        },
        "precision_threshold": 100,
        "rehash": true,
        "script": "_value",
        "params": {},
        "lang": "mvel"
      }

    }
  };
  return function init(api) {

    api.addGlobalAutocompleteRules('aggregations', rules);
    api.addGlobalAutocompleteRules('aggs', rules);
  };

});
