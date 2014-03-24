define(function () {
  'use strict';
  return function init(api) {
    api.addEndpointDescription('_nodes/hot_threads', {
      methods: ['GET'],
      patterns: [
        "_nodes/hot_threads",
        "_nodes/{nodes}/hot_threads"
      ]
    });
  };
});