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

    var pushShardToData = function (shard) {
      data.push(setNodeName(shard)); 
    };

    var data = [];
    _.each(state.routing_nodes.nodes, function (node) {
      _.each(node, pushShardToData);
    });

    _.each(state.routing_nodes.unassigned, pushShardToData);
    
    return data;
  };

  var identity = function (state) {
    return state && state._id;
  };

  return _.memoize(extractShards, identity);
});

