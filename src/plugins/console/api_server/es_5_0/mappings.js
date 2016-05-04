let _ = require("lodash");

var BOOLEAN = {
  __one_of: [true, false]
};

module.exports = function (api) {
  api.addEndpointDescription('_get_mapping', {
    methods: ['GET'],
    priority: 10, // collides with get doc by id
    patterns: [
      "{indices}/_mapping",
      "{indices}/_mapping/{types}",
      "{indices}/{types}/_mapping",
      "_mapping"
    ]
  });
  api.addEndpointDescription('_get_field_mapping', {
    methods: ['GET'],
    priority: 10, // collides with get doc by id
    patterns: [
      "{indices}/_mapping/field/{fields}",
      "{indices}/_mapping/{type}/field/{fields}"
    ],
    url_params: {
      "include_defaults": "__flag__"
    }
  });
  api.addEndpointDescription('_delete_mapping', {
    methods: ['DELETE'],
    priority: 10, // collides with get doc by id
    patterns: [
      "{indices}/_mapping",
      "{indices}/_mapping/{types}",
      "{indices}/{types}/_mapping",
      "_mapping"
    ]
  });
  api.addEndpointDescription('_put_type_mapping', {
    methods: ['PUT', 'POST'],
    patterns: [
      "{indices}/{type}/_mapping",
      "{indices}/_mapping/{type}"
    ],
    priority: 10, // collides with put doc by id
    data_autocomplete_rules: {
      __template: {
        properties: {
          'FIELD': {}
        }
      },
      '_source': {
        'enabled': BOOLEAN
      },
      '_all': {
        'enabled': BOOLEAN
      },
      '_field_names': {
        'index': BOOLEAN
      },
      '_routing': {
        'required': BOOLEAN,
      },
      '_index': {
        'enabled': BOOLEAN
      },
      '_parent': {
        __template: {
          'type': ''
        },
        'type': '{type}'
      },
      '_timestamp': {
        'enabled': BOOLEAN,
        'format': 'YYYY-MM-dd',
        'default': ""
      },
      'dynamic_date_formats': ['yyyy-MM-dd'],
      'date_detection': BOOLEAN,
      'numeric_detection': BOOLEAN,
      'properties': {
        '*': {
          type: {
            __one_of: ['text', 'keyword', 'float', 'double', 'byte', 'short', 'integer', 'long', 'date', 'boolean',
              'binary', 'object', 'nested', "geo_point", "geo_shape"
            ]
          },

          // strings
          store: BOOLEAN,
          index: BOOLEAN,
          term_vector: {
            __one_of: ['no', 'yes', 'with_offsets', 'with_positions', 'with_positions_offsets']
          },
          boost: 1.0,
          null_value: '',

          norms: BOOLEAN,

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
          ignore_malformed: BOOLEAN,

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
            __one_of: _.flatten([_.map(['date', 'date_time', 'date_time_no_millis',
              'ordinal_date', 'ordinal_date_time', 'ordinal_date_time_no_millis',
              'time', 'time_no_millis', 't_time', 't_time_no_millis',
              'week_date', 'week_date_time', 'week_date_time_no_millis'], function (s) {
              return ['basic_' + s, 'strict_' + s];
            }),
              [
                'date', 'date_hour', 'date_hour_minute', 'date_hour_minute_second', 'date_hour_minute_second_fraction',
                'date_hour_minute_second_millis', 'date_optional_time', 'date_time', 'date_time_no_millis',
                'hour', 'hour_minute', 'hour_minute_second', 'hour_minute_second_fraction', 'hour_minute_second_millis',
                'ordinal_date', 'ordinal_date_time', 'ordinal_date_time_no_millis', 'time', 'time_no_millis',
                't_time', 't_time_no_millis', 'week_date', 'week_date_time', 'weekDateTimeNoMillis', 'week_year',
                'weekyearWeek', 'weekyearWeekDay', 'year', 'year_month', 'year_month_day', 'epoch_millis', 'epoch_second'
              ]])
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
            __scope_link: '_put_mapping.{type}.properties'
          },

          // multi_field
          fields: {
            '*': {
              __scope_link: '_put_mapping.type.properties.field'
            }
          },
          copy_to: {__one_of: ['{field}', ['{field}']]},

          // nested
          include_in_parent: BOOLEAN,
          include_in_root: BOOLEAN
        }
      }
    }

  });
  api.addEndpointDescription('_put_mapping', {
    methods: ['PUT'],
    patterns: [
      "{indices}/_mapping"
    ],
    data_autocomplete_rules: {
      '{type}': {
        __scope_link: '_put_type_mapping'
      }
    }
  });
};
