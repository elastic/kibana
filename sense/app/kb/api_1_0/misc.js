define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_stats', {
      methods: ['GET'],
      endpoint_autocomplete: ['_stats'],
      indices_mode: 'multi',
      types_mode: 'none',
      doc_id_mode: 'none'
    });

    api.addEndpointDescription('_cache/clear', {
      methods: ['GET'],
      endpoint_autocomplete: ['_cache/clear'],
      indices_mode: 'multi',
      types_mode: 'none',
      doc_id_mode: 'none'
    });

    api.addEndpointDescription('_status', {
      methods: ['GET'],
      indices_mode: 'multi',
      types_mode: 'none',
      doc_id_mode: 'none',
      endpoint_autocomplete: ['_status']
    });


  };

});