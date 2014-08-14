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
  var extractShards = require('lib/extractShards');
  var _ = require('lodash');  

  var filterHiddenIndices = require('../lib/filterHiddenIndices');
  var extractIp = require('../lib/extractIp');

  return function ($scope) {
    return function nodesByIndices (state) {

      function createIndex (obj, shard) {
        var id = shard.index;
        if (obj[id]) {
          return obj;
        }
        obj[id] = {
          id: id,
          name: id,
          children: [],
          unassigned: [],
          unassignedPrimaries: false,
          type: 'index'
        };
        return obj;
      }

      function createNodeAddShard (obj, shard) {
        var node = shard.node;
        var index = shard.index;

        // If the node is null then it's an unassigned shard and we need to 
        // add it to the unassigned array.
        if (node === null) {
          obj[index].unassigned.push(shard);
          // if the shard is a primary we need to set the unassignedPrimaries flag
          if (shard.primary) {
            obj[index].unassignedPrimaries = true;
          }
          return obj;
        }

        var nodeObj = _.find(obj[index].children, { id: node });
        if (!nodeObj) {
          nodeObj = {
            id: node,
            name: state.nodes[node].name,
            type: 'node',
            ip_port: extractIp(state.nodes[node]),
            master: state.master_node === node,
            children: []
          };
          obj[index].children.push(nodeObj);
        }
        nodeObj.children.push(shard);
        return obj;
      }

      var shards = extractShards(state);

      if (!$scope.panel.show_hidden) {
        shards = shards.filter(filterHiddenIndices);
      }
      
      var data = _.reduce(shards, function (obj, shard) {
        obj = createIndex(obj, shard);
        obj = createNodeAddShard(obj, shard);
        return obj;
      }, {});

      return _(data).values()
        .sortBy(function (index) {
          return [ !index.unassignedPrimaries, /^\./.test(index.name), index.name ];
        })
        .value();
    };
  };
  
});
