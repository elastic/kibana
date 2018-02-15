export default function (api) {
  api.addEndpointDescription('_snapshot_status', {
    methods: ['GET'],
    patterns: [
      '_snapshot/_status',
      '_snapshot/{id}/_status',
      '_snapshot/{id}/{ids}/_status'
    ]
  });
}
