export default function (api) {
  api.addEndpointDescription('restore_snapshot', {
    methods: ['POST'],
    patterns: [
      '_snapshot/{id}/{id}/_restore'
    ],
    url_params: {
      wait_for_completion: "__flag__"
    },
    data_autocomplete_rules: {
      indices: "*",
      ignore_unavailable: { __one_of: [true, false] },
      include_global_state: false,
      rename_pattern: "index_(.+)",
      rename_replacement: "restored_index_$1"
    }
  });

  api.addEndpointDescription('all_snapshots', {
    methods: ['GET'],
    patterns: [
      '_snapshot/{id}/_all'
    ]
  });

  api.addEndpointDescription('_snapshot_status', {
    methods: ['GET'],
    patterns: [
      '_snapshot/_status',
      '_snapshot/{id}/_status',
      '_snapshot/{id}/{ids}/_status'
    ]
  });
}
