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
    api.addEndpointDescription('_post_aliases', {
      methods: ['POST'],
      patterns: [
        "_aliases",
      ],
      data_autocomplete_rules: {
        'actions': {
          __template: [
            { 'add': { 'index': 'test1', 'alias': 'alias1' } }
          ],
          __any_of: [
            {
              add: {
                index: '{index}',
                alias: '',
                filter: {},
                routing: '1',
                search_routing: '1,2',
                index_routing: '1'
              },
              remove: {
                index: '',
                alias: ''
              }
            }
          ]
        }
      }
    });
    api.addEndpointDescription('_get_aliases', {
      methods: ['GET'],
      patterns: [
        "_aliases",
      ]
    });

    var aliasRules = {
      filter: {},
      routing: '1',
      search_routing: '1,2',
      index_routing: '1'
    };

    api.addEndpointDescription('_post_alias', {
      methods: ["POST", "PUT"],
      patterns: [
        "{indices}/_alias/{name}"
      ],
      data_autocomplete_rules: aliasRules 
    });
    api.addEndpointDescription('_delete_alias', {
      methods: ["DELETE"],
      patterns: [
        "{indices}/_alias/{name}"
      ]
    });
    api.addEndpointDescription('_get_alias', {
      methods: ["GET"],
      patterns: [
        "_alias",
        "{indices}/_alias",
        "{indices}/_alias/{name}",
        "_alias/{name}"
      ]
    });

    api.addGlobalAutocompleteRules('aliases', {
      '*': aliasRules
    });
  };
});
