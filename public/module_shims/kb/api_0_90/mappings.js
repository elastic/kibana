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
    api.addEndpointDescription('_get_mapping', {
      methods: ['GET'],
      priority: 10, // collides with get doc by id
      patterns: [
        "{indices}/_mapping",
        "{indices}/{types}/_mapping",
        "_mapping"
      ]
    });
    api.addEndpointDescription('_put_mapping', {
      methods: ['PUT'],
      patterns: [
        "{indices}/_mapping",
        "{indices}/{type}/_mapping",
      ],
      priority: 10, // collides with put doc by id
      data_autocomplete_rules: {
        '{type}': {
          __template: {
            properties: {
              'FIELD': {}
            }
          },
          '_parent': {
            __template: {
              'type': ''
            },
            'type': '{type}'
          },
          'index_analyzer': 'standard',
          'search_analyzer': 'standard',
          'analyzer': 'standard',
          'dynamic_date_formats': ['yyyy-MM-dd'],
          'date_detection': {
            __one_of: [true, false]
          },
          'numeric_detection': {
            __one_of: [true, false]
          },
          'properties': {
            '*': {
              type: {
                __one_of: ['string', 'float', 'double', 'byte', 'short', 'integer', 'long', 'date', 'boolean',
                  'binary', 'object', 'nested', 'multi_field'
                ]
              },

              // strings
              index_name: '',
              store: {
                __one_of: ['no', 'yes']
              },
              index: {
                __one_of: ['analyzed', 'not_analyzed', 'no']
              },
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
              ignore_malformed: {
                __one_of: [true, false]
              },

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
                __scope_link: '_put_mapping.type.properties'
              },

              // multi_field
              path: {
                __one_of: ['just_name', 'full']
              },
              fields: {
                '*': {
                  __scope_link: '_put_mapping.type.properties.field'
                }
              }
            }
          }
        }
      }
    });
  };

});