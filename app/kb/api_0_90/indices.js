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
        "{indices}/_stats",
        "_stats"
      ]
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