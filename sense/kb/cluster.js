sense.kb.addEndpointDescription('_cluster/nodes/stats', {
  methods: ["GET"],
  indices_mode: "none",
  types_mode: "none"
});
sense.kb.addEndpointDescription('_cluster/state', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/state'],
  indices_mode: "none",
  types_mode: "none"
});

sense.kb.addEndpointDescription('_cluster/health', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/health'],
  indices_mode: "none",
  types_mode: "none"
});

sense.kb.addEndpointDescription('_cluster/settings', {
    methods: ["GET", "PUT"],
    endpoint_autocomplete: ['_cluster/settings'],
    indices_mode: "none",
    types_mode: "none",
    data_autocomplete_rules:  {
        persistent: {
            "routing.allocation.same_shard.host" : { __one_of: [ false, true ]}
        },

        transient: {
            __scope_link: ".persistent"
        }
    }
});
