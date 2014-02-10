define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_refresh', {
      methods: ['POST']
    });

    api.addEndpointDescription('_stats', {
      patterns: [
        "{indices}/_stats",
        "_stats"
      ]
    });

    api.addEndpointDescription('_segments', {
      patterns: [
        "{indices}/_segments",
        "_segments"
      ]
    });

    api.addEndpointDescription('__create_index__', {
      methods: ['PUT'],
      patterns: [
        "{index}"
      ],
      data_autocomplete_rules: {
        mappings: {
          __scope_link: '_put_mapping'
        },
        settings: {
          __scope_link: '_put_settings.index'
        }
      }
    });

    api.addEndpointDescription('__delete_indices__', {
      methods: ['DELETE'],
      patterns: [
        "{indices}"
      ]
    });
  };

});