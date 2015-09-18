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
    api.addEndpointDescription('_field_stats', {
      methods: ['GET', 'POST'],
      patterns: [
        "_field_stats",
        "{indices}/_field_stats"
      ],
      url_params: {
        fields: [],
        level: ["cluster", "indices"],
        ignore_unavailable: ["true", "false"],
        allow_no_indices: [false, true],
        expand_wildcards: ["open", "closed", "none", "all"]
      },
      data_autocomplete_rules: {
        fields: [
          "{field}",
        ],
        index_constraints : {
          "{field}" : {
            min_value : {
              gt : "MIN",
              gte : "MAX",
              lt: "MIN",
              lte: "MAX"
            },
            max_value : {
              gt : "MIN",
              gte : "MAX",
              lt: "MIN",
              lte: "MAX"
            }
          },
          __template : {
            "FIELD" : {
              min_value : {
                gt : "MIN"
              },
              max_value : {
                lt: "MAX"
              }
            }
          }
        }
      }
    });
  };
});