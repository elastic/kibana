define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function (state, primary, includeRelocating) {
    includeRelocating = _.isUndefined(includeRelocating) ? false : includeRelocating;
    return function (shard) {
      var relocating = shard.state === "INITIALIZING" && !_.isEmpty(shard.relocating_node);
      return (shard.state === state && shard.primary === primary && (includeRelocating || !relocating));
    };
  };   
});
