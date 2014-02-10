define(function () {
  'use strict';

  function addSimple(endpoint, api) {
    api.addEndpointDescription(endpoint, {
      methods: ['GET' ],
    });
  }


  return function init(api) {
    api.addEndpointDescription('_cluster/nodes/stats');
    api.addEndpointDescription('_cluster/state');
    api.addEndpointDescription('_cluster/health');
    api.addEndpointDescription('_cluster/pending_tasks');
    api.addEndpointDescription('get_cluster/settings', {
      patterns: [
        '_cluster/settings'
      ]
    });

    api.addEndpointDescription('put_cluster/settings', {
      methods: ['PUT'],
      patterns: [
        '_cluster/settings'
      ],
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