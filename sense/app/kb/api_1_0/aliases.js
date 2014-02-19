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
                index: '$INDEX$',
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
    api.addEndpointDescription('_post_alias', {
      methods: ["POST", "PUT"],
      patterns: [
        "{indices}/_alias/{name}"
      ],
      data_autocomplete_rules: {
        filter: {},
        routing: '1',
        search_routing: '1,2',
        index_routing: '1'
      }
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
  };
});