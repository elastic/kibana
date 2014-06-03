define(function (require) {
  'use strict';
  var extractShards = require('lib/extractShards');
  var _ = require('lodash');

  var filterHiddenIndices = require('../lib/filterHiddenIndices');
  var hasPrimaryChildren = require('../lib/hasPrimaryChildren');
  var extractIp = require('../lib/extractIp');

  return function ($scope) {
    return function nodesByIndices (state) {

      var getNodeType = function (node) {
        if (node.attributes.client === 'true') {
          return 'client';
        }
        if (node.attributes.data === 'false') {
          return node.attributes.master === 'true' ? 'master' : 'client';
        }
        if (node.attributes.master === 'false') {
          // we know data is true here..
          return 'data';
        }
        return 'normal';
      };

      function createNode (obj, node, id) {
        node.master = state.master_node === id;
        node.details = extractIp(node);
        node.ip_port = extractIp(node);
        node.type = 'node';
        node.children = [];
        var nodeType = getNodeType(node);
        if (nodeType === 'normal' || nodeType === 'data') {
          obj[id] = node;
        }
        return obj;
      }

      function createIndexAddShard (obj, shard) {
        var node = shard.node || 'unassigned';
        var index = shard.index;
        var indexObj = _.find(obj[node].children, { id: index });
        if (!indexObj) {
          indexObj = {
            id: index,
            name: index,
            type: 'index',
            children: []
          };
          obj[node].children.push(indexObj);
        }
        indexObj.children.push(shard);
        return obj;
      }

      var shards = extractShards(state);
      if (!$scope.panel.show_hidden) {
        shards = shards.filter(filterHiddenIndices);
      }

      var data = _.reduce(state.nodes, createNode, {});
      if (state.routing_nodes.unassigned.length !==0 ) {
        data.unassigned = {
          name: 'Unassigned',
          master: false,
          type: 'node',
          children: []
        };
      }

      data = _.reduce(shards, createIndexAddShard, data);

      return _(data).values()
        .sortBy(function (node) {
          return [ node.name !== 'Unassigned', !node.master, node.name ];
        })
        .map(function (node) {
          if (node.name === 'Unassigned') {
            node.unassignedPrimaries = node.children.some(hasPrimaryChildren);
          }
          return node;
        })
        .value();
    };
  };
});
