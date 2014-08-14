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
    api.addEndpointDescription('_delete_template', {
      methods: ['DELETE'],
      patterns: [
        "_template/{id}",
      ]
    });
    api.addEndpointDescription('_get_template', {
      methods: ['GET'],
      patterns: [
        "_template/{id}",
        "_template",
      ]
    });
    api.addEndpointDescription('_put_template', {
      methods: ['PUT'],
      patterns: [
        "_template/{id}",
      ],
      data_autocomplete_rules: {
        template: 'index*',
        warmers: { __scope_link: '_warmer' },
        mappings: {},
        settings: {}
      }
    });
  };

});