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
    api.addEndpointDescription('_search', {
      methods: ['GET', 'POST'],
      priority: 10, // collides with get doc by id
      patterns: [
        "{indices}/{types}/_count",
        "{indices}/_count",
        "_count"
      ],
      url_params: {
        preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
        routing: "",
        min_score: 1.0
      },
      data_autocomplete_rules: {
        __scope_link: "GLOBAL.query"
      }
    })
  }
});