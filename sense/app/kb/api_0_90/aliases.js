define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_aliases', {
      def_method: 'GET',
      methods: ['GET', 'POST'],
      patterns: [
        "{indices}/_aliases",
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
  };
});