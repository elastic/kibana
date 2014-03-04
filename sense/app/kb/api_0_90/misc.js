define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_cache/clear');

    api.addEndpointDescription('_status');

  };

});