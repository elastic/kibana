define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_cluster/nodes/stats');
    api.addEndpointDescription('_cluster/state', {
      patterns: [
        "_cluster/state",
        "_cluster/state/{metrics}",
        "_cluster/state/{metrics}/{indices}"
      ],
      url_components: {
        "metrics": [ "version", "master_node", "nodes", "routing_table", "metadata", "blocks" ]
      }
    });
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
          'routing.allocation.same_shard.host': { __one_of: [ false, true ]},
          'cluster.routing.allocation.enable': { __one_of: [ "all", "primaries", "new_primaries", "none" ]}
        },
        transient: {
          __scope_link: '.persistent'
        }
      }
    });
  };
});