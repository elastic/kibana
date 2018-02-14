export default function (api) {
  api.addEndpointDescription('_rollover', {
    methods: ['POST'],
    patterns: [
      "{name}/_rollover",
      "{name}/_rollover/{name}"
    ],
    url_params: {
      wait_for_active_shards: "",
      dry_run: "__flag__"
    }
  });

  api.addEndpointDescription('__create_index__', {
    methods: ['PUT'],
    patterns: [
      "{index}"
    ],

  });
}
