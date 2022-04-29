"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mappings = void 0;

var _shared = require("./shared");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const mappings = specService => {
  specService.addEndpointDescription('put_mapping', {
    priority: 10,
    // collides with put doc by id
    data_autocomplete_rules: {
      __template: {
        properties: {
          FIELD: {}
        }
      },
      _source: {
        enabled: _shared.BOOLEAN
      },
      _all: {
        enabled: _shared.BOOLEAN
      },
      _field_names: {
        index: _shared.BOOLEAN
      },
      _routing: {
        required: _shared.BOOLEAN
      },
      _index: {
        enabled: _shared.BOOLEAN
      },
      _parent: {
        __template: {
          type: ''
        },
        type: '{type}'
      },
      _timestamp: {
        enabled: _shared.BOOLEAN,
        format: 'YYYY-MM-dd',
        default: ''
      },
      dynamic_date_formats: ['yyyy-MM-dd'],
      date_detection: _shared.BOOLEAN,
      numeric_detection: _shared.BOOLEAN,
      properties: {
        '*': {
          type: {
            __one_of: ['text', 'keyword', 'float', 'half_float', 'scaled_float', 'double', 'byte', 'short', 'integer', 'long', 'date', 'boolean', 'binary', 'object', 'nested', 'geo_point', 'geo_shape']
          },
          // strings
          store: _shared.BOOLEAN,
          index: _shared.BOOLEAN,
          term_vector: {
            __one_of: ['no', 'yes', 'with_offsets', 'with_positions', 'with_positions_offsets']
          },
          boost: 1.0,
          null_value: '',
          doc_values: _shared.BOOLEAN,
          eager_global_ordinals: _shared.BOOLEAN,
          norms: _shared.BOOLEAN,
          coerce: _shared.BOOLEAN,
          // Not actually available in V6 of ES. Add when updating the autocompletion system.
          // index_phrases: BOOLEAN,
          // index_prefixes: { min_chars, max_chars },
          index_options: {
            __one_of: ['docs', 'freqs', 'positions']
          },
          analyzer: 'standard',
          search_analyzer: 'standard',
          include_in_all: {
            __one_of: [false, true]
          },
          ignore_above: 10,
          position_increment_gap: 0,
          // numeric
          precision_step: 4,
          ignore_malformed: _shared.BOOLEAN,
          scaling_factor: 100,
          // geo_point
          lat_lon: {
            __one_of: [true, false]
          },
          geohash: {
            __one_of: [true, false]
          },
          geohash_precision: '1m',
          geohash_prefix: {
            __one_of: [true, false]
          },
          validate: {
            __one_of: [true, false]
          },
          validate_lat: {
            __one_of: [true, false]
          },
          validate_lon: {
            __one_of: [true, false]
          },
          normalize: {
            __one_of: [true, false]
          },
          normalize_lat: {
            __one_of: [true, false]
          },
          normalize_lon: {
            __one_of: [true, false]
          },
          // geo_shape
          tree: {
            __one_of: ['geohash', 'quadtree']
          },
          precision: '5km',
          tree_levels: 12,
          distance_error_pct: 0.025,
          orientation: 'ccw',
          // dates
          format: {
            // outer array required to for an array of string values
            __one_of: [[...['date', 'date_time', 'date_time_no_millis', 'ordinal_date', 'ordinal_date_time', 'ordinal_date_time_no_millis', 'time', 'time_no_millis', 't_time', 't_time_no_millis', 'week_date', 'week_date_time', 'week_date_time_no_millis'].flatMap(function (s) {
              return ['basic_' + s, 'strict_' + s];
            }), ...['date', 'date_hour', 'date_hour_minute', 'date_hour_minute_second', 'date_hour_minute_second_fraction', 'date_hour_minute_second_millis', 'date_optional_time', 'date_time', 'date_time_no_millis', 'hour', 'hour_minute', 'hour_minute_second', 'hour_minute_second_fraction', 'hour_minute_second_millis', 'ordinal_date', 'ordinal_date_time', 'ordinal_date_time_no_millis', 'time', 'time_no_millis', 't_time', 't_time_no_millis', 'week_date', 'week_date_time', 'weekDateTimeNoMillis', 'weekyear', 'strict_weekyear', 'weekyear_week', 'strict_weekyear_week', 'strict_date_optional_time_nanos', 'weekyear_week_day', 'strict_weekyear_week_day', 'year', 'year_month', 'year_month_day', 'epoch_millis', 'epoch_second']].sort()]
          },
          fielddata: {
            filter: {
              regex: '',
              frequency: {
                min: 0.001,
                max: 0.1,
                min_segment_size: 500
              }
            }
          },
          similarity: {
            __one_of: ['default', 'BM25']
          },
          // objects
          properties: {
            __scope_link: 'put_mapping.{type}.properties'
          },
          // multi_field
          fields: {
            '*': {
              __scope_link: 'put_mapping.type.properties.field'
            }
          },
          copy_to: {
            __one_of: ['{field}', ['{field}']]
          },
          // nested
          include_in_parent: _shared.BOOLEAN,
          include_in_root: _shared.BOOLEAN
        }
      }
    }
  });
};

exports.mappings = mappings;