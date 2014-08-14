/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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

