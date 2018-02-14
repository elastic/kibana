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

  api.addEndpointDescription('_validate_query', {
    methods: ['GET', 'POST'],
    patterns: [
      "{indices}/_validate/query",
      "_validate/query"
    ],
    url_params: {
      explain: "__flag__",
      rewrite: "__flag__"
    },
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      }
    }
  });

  api.addEndpointDescription('__create_index__', {
    methods: ['PUT'],
    patterns: [
      "{index}"
    ],

  });
}
