define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_cluster/nodes/stats');

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