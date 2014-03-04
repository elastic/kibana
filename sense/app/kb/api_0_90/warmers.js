define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_get_warmer', {
      patterns: ["_warmer", "_warmer/{id}"]
    });
    api.addEndpointDescription('_delete_warmer', {
      methods: ['DELETE'],
      patterns: [
        "{indices}/_warmer",
        "{indices}/_warmer/{id}"
      ]
    });
    api.addEndpointDescription('_put_warmer', {
      methods: ['PUT'],
      patterns: [
        "{indices}/_warmer",
        "{indices}/_warmer/{id}",
        "{indices}/{types}/_warmer/{id}"
      ],
      data_autocomplete_rules: {
        query: {
          // populated by a global rule
        },
        facets: {
          // populated by a global rule
        }
      }
    });
  };

});