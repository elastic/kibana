define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_stats', {
      patterns: [
        "_stats",
        "{indices}/_stats"
      ]
    });

    api.addEndpointDescription('_cache/clear', {
      patterns: [
        "_cache/clear",
        "{indices}/_cache/clear"
      ]
    });

    api.addEndpointDescription('_status', {
      patterns: [
        "_status",
        "{indices}/_status"
      ]
    });
  };
});