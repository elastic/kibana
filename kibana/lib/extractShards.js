define(function (require) {
  'use strict';
  var _ = require('lodash');  

  var extractShards = function (state) {
    if (!state) {
      return [];
    }

    function setNodeName (shard) {
      var node = state.nodes[shard.node];
      shard.nodeName = ( node && node.name ) || null;
      shard.type = 'shard';
      if (shard.state === 'INITIALIZING' && shard.relocating_node) {
        shard.relocating_message = 'Relocating from '+state.nodes[shard.relocating_node].name;
      }
      if (shard.state === 'RELOCATING') {
        shard.relocating_message = 'Relocating to '+state.nodes[shard.relocating_node].name;
      }
      return shard;
    }

    var data  = _.chain(state.routing_nodes.nodes)
      .values()
      .flatten()
      .union(state.routing_nodes.unassigned)
      .map(setNodeName)
      .value(); 

    return data;
  };

  var identity = function (state) {
    return state && state._id;
  };

  return _.memoize(extractShards, identity);
});

