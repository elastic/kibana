module.exports = function (api) {
  api.addEndpointDescription('_count', {
      methods: ['GET', 'POST'],
      priority: 10, // collides with get doc by id
      patterns: [
        "{indices}/{types}/_count",
        "{indices}/_count",
        "_count"
      ],
      url_params: {
        preference: ["_primary", "_primary_first", "_local", "_only_node:xyz", "_prefer_node:xyz", "_shards:2,3"],
        routing: "",
        min_score: 1.0,
        terminate_after: 10,
      },
      data_autocomplete_rules: {
        query: {
          // populated by a global rule
        }
      }
  });
};
