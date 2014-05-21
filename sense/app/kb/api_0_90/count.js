define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_search', {
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
        min_score: 1.0
      },
      data_autocomplete_rules: {
        __scope_link: "GLOBAL.query"
      }
    })
  }
});