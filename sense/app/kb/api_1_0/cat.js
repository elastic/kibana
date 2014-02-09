define(function () {
  'use strict';


  function addSimpleCat(endpoint, api) {
    api.addEndpointDescription(endpoint, {
      match: endpoint,
      def_method: 'GET',
      methods: ['GET' ],
      endpoint_autocomplete: [
        endpoint
      ],
      indices_mode: 'none',
      types_mode: 'none',
      doc_id_mode: 'none',
      data_autocomplete_rules: {}
    });
  }

  return function init(api) {
    addSimpleCat('_cat/aliases', api);
    addSimpleCat('_cat/allocation', api);
    addSimpleCat('_cat/count', api);
    addSimpleCat('_cat/health', api);
    addSimpleCat('_cat/indices', api);
    addSimpleCat('_cat/master', api);
    addSimpleCat('_cat/nodes', api);
    addSimpleCat('_cat/pending_tasks', api);
    addSimpleCat('_cat/recovery', api);
    addSimpleCat('_cat/thread_pool', api);
    addSimpleCat('_cat/shards', api);
  };
});