var INDEX_SETTING = {
  __one_of: ['analyzed', 'not_analyzed', 'no']
}, BOOLEAN = {
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
      '_id': {
        'index': INDEX_SETTING,
        'store': BOOLEAN,
        'path': ""
      },
      '_type': {
        'index': INDEX_SETTING,
        'store': BOOLEAN
      },
      '_source': {
        'enabled': BOOLEAN
      },
      '_all': {
        'enabled': BOOLEAN
      },
      '_analyzer': {
        'path': ""
      },
      '_field_names': {
        'index': INDEX_SETTING
      },
      '_routing': {
        'required': BOOLEAN,
        'path': ""
      },
      '_index': {
        'enabled': BOOLEAN
      },
      '_size': {
        'enabled': BOOLEAN,
        'store': BOOLEAN
      },
      '_parent': {
        __template: {
          'type': ''
        },
        'type': '{type}'
      },
      '_timestamp': {
        'enabled': BOOLEAN,
        'path': '',
        'format': 'YYYY-MM-dd',
        'default': ""
      },
      'index_analyzer': 'standard',
      'search_analyzer': 'standard',
      'analyzer': 'standard',
      'dynamic_date_formats': ['yyyy-MM-dd'],
      'date_detection': BOOLEAN,
      'numeric_detection': BOOLEAN,
      'transform': {
        __template: {
          script: ""
        },
        __one_of: [
          {
            script: "",
            params: {},
            lang: "groovy"
          },
          [
            {
              script: "",
              params: {},
              lang: "groovy"
            }
          ]
        ]


      },
      'properties': {
        '*': {
          type: {
            __one_of: ['string', 'float', 'double', 'byte', 'short', 'integer', 'long', 'date', 'boolean',
              'binary', 'object', 'nested', "geo_point", "geo_shape"
            ]
          },

          // strings
          index_name: '',
          store: BOOLEAN,
          index: INDEX_SETTING,
          term_vector: {
            __one_of: ['no', 'yes', 'with_offsets', 'with_positions', 'with_positions_offsets']
          },
          boost: 1.0,
          null_value: '',
          omit_norms: {
            __one_of: [true, false]
          },
          index_options: {
            __one_of: ['docs', 'freqs', 'positions']
          },
          analyzer: 'standard',
          index_analyzer: 'standard',
          search_analyzer: 'standard',
          include_in_all: {
            __one_of: [false, true]
          },
          ignore_above: 10,
          position_offset_gap: 0,

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
            __one_of: ['basic_date', 'basic_date_time', 'basic_date_time_no_millis',
              'basic_ordinal_date', 'basic_ordinal_date_time', 'basic_ordinal_date_time_no_millis',
              'basic_time', 'basic_time_no_millis', 'basic_t_time', 'basic_t_time_no_millis',
              'basic_week_date', 'basic_week_date_time', 'basic_week_date_time_no_millis',
              'date', 'date_hour', 'date_hour_minute', 'date_hour_minute_second', 'date_hour_minute_second_fraction',
              'date_hour_minute_second_millis', 'date_optional_time', 'date_time', 'date_time_no_millis',
              'hour', 'hour_minute', 'hour_minute_second', 'hour_minute_second_fraction', 'hour_minute_second_millis',
              'ordinal_date', 'ordinal_date_time', 'ordinal_date_time_no_millis', 'time', 'time_no_millis',
              't_time', 't_time_no_millis', 'week_date', 'week_date_time', 'weekDateTimeNoMillis', 'week_year',
              'weekyearWeek', 'weekyearWeekDay', 'year', 'year_month', 'year_month_day'
            ]
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
          postings_format: {
            __one_of: ['direct', 'memory', 'pulsing', 'bloom_default', 'bloom_pulsing', 'default']
          },
          similarity: {
            __one_of: ['default', 'BM25']
          },

          // objects
          properties: {
            __scope_link: '_put_mapping.{type}.properties'
          },

          // multi_field
          path: {
            __one_of: ['just_name', 'full']
          },
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
