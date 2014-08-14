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
    api.addEndpointDescription('_get_warmer', {
      patterns: ["_warmer", "_warmer/{name}", "{indices}/_warmer", "{indices}/_warmer/{name}"]
    });
    api.addEndpointDescription('_delete_warmer', {
      methods: ['DELETE'],
      patterns: [
        "{indices}/_warmer/{name}"
      ]
    });
    api.addEndpointDescription('_put_warmer', {
      methods: ['PUT'],
      patterns: [
        "{indices}/_warmer/{name}",
        "{indices}/{types}/_warmer/{name}"
      ],
      data_autocomplete_rules: {
        query: {
          // populated by a global rule
        },
        facets: {
          // populated by a global rule
        },
        aggs: {

        },
        sort: {
          __scope_link: "_search.sort"
        }
      }
    });
  };

});