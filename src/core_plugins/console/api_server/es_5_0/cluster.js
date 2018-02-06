export default function (api) {
  api.addEndpointDescription('_cluster/state', {
    patterns: [
      "_cluster/state",
      "_cluster/state/{metrics}",
      "_cluster/state/{metrics}/{indices}"
    ],
    url_components: {
      "metrics": ["version", "master_node", "nodes", "routing_table", "routing_node", "metadata", "blocks"]
    }
  });

  api.addEndpointDescription('_cluster/reroute', {
    methods: ['POST'],
    url_params: {
      explain: "__flag__",
      dry_run: "__flag__"
    },
    data_autocomplete_rules: {
      commands: [
        {
          move: {
            __template: {
              index: "",
              shard: 0,
              from_node: "",
              to_node: ""
            },
            index: "{index}",
            shard: 0,
            from_node: "{node}",
            to_node: "{node}"
          },
          cancel: {
            __template: {
              index: "",
              shard: 0,
              node: ""
            },
            index: "{index}",
            shard: 0,
            node: "{node}",
            allow_primary: { __one_of: [true, false] }
          },
          allocate: {
            __template: {
              index: "",
              shard: 0,
              node: ""
            },
            index: "{index}",
            shard: 0,
            node: "{node}",
            allow_primary: { __one_of: [true, false] }
          }
        }
      ],
      dry_run: { __one_of: [true, false] }
    }
  });
}
