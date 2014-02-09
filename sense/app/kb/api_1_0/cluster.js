define(function () {
  'use strict';

  function addSimple(endpoint, api) {
    api.addEndpointDescription(endpoint, {
      def_method: 'GET',
      methods: ['GET' ],
      indices_mode: 'none',
    });
  }


  return function init(api) {
    addSimple('_cluster/nodes/stats', api);
    addSimple('_cluster/state', api);
    addSimple('_cluster/health', api);
    addSimple('_cluster/pending_tasks', api);

    api.addEndpointDescription('_cluster/settings', {
      methods: ['GET', 'PUT'],
      endpoint_autocomplete: ['_cluster/settings'],
      indices_mode: 'none',
      types_mode: 'none',
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