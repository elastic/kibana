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
}
