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