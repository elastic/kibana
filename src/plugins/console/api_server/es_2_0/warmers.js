module.exports = function (api) {
  api.addEndpointDescription('_get_warmer', {
    patterns: ["_warmer", "_warmer/{name}", "{indices}/_warmer", "{indices}/_warmer/{name}"]
  });
  api.addEndpointDescription('_delete_warmer', {
    methods: ['DELETE'],
    patterns: [
      "{indices}/_warmer/{name}"
    ]
  });
  api.addEndpointDescription('_put_warmer', {
    methods: ['PUT'],
    patterns: [
      "{indices}/_warmer/{name}",
      "{indices}/{types}/_warmer/{name}"
    ],
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      },
      facets: {
        // populated by a global rule
      },
      aggs: {},
      sort: {
        __scope_link: "_search.sort"
      }
    }
  });
};
