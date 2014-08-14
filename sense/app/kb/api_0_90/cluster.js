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

    api.addEndpointDescription('_cluster/state');

    api.addEndpointDescription('_cluster/health');

    api.addEndpointDescription('_cluster/settings', {
      methods: ['GET', 'PUT'],
      data_autocomplete_rules: {
        persistent: {
          'routing.allocation.same_shard.host': { __one_of: [ false, true ]}
        },
        transient: {
          __scope_link: '.persistent'
        }
      }
    });
  };
});