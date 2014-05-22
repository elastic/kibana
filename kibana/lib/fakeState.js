define(function (require) {
	'use strict';
	var _ = require('lodash');
  var moment = require('moment');
	return function (options) {

		options = _.defaults(options || {}, {
			indices: 20,
			nodes: 1,
			shards: 5,
			replicas: 1
		});

		var state = {
      _id: new Date().getTime()+Math.random(),
			cluster_name: 'elasticsearch',
			version: 1,
			nodes: {},
			routing_nodes: {
				unassigned: [],
				nodes: {}
			}
		};

		// Generate Nodes
		_.times(options.nodes, function (n) {
			var id = 'node_'+(n+1);
			state.nodes[id] = {
				name: 'Node '+(n+1),
				transport_address: 'inet[localhost/127.0.0.1:'+(9300+n)+']',
				attributes: {}
			};
			state.routing_nodes.nodes[id] = [];
		});

		var nodeIds       = _.keys(state.nodes);
		state.master_node = nodeIds[0];
		var currentNode   = 0;

		var getNode = function () {
			var node = nodeIds[currentNode];
			if (options.nodes > 1) {
				if (currentNode < (options.nodes-1)) {
					currentNode++;
				} else {
					currentNode = 0;
				}
			}
			return node;
		};

		// Generate Indices
		_.times(options.indices, function (n) {
			var index = moment().subtract('days', n).format('[logstash-]YYYY.MM.DD');
			_.times(options.shards, function (shard) {

				// Generate Primary Shards   
				var node = getNode();
				state.routing_nodes.nodes[node].push({
					state           : 'STARTED',
					primary         : true,
					node            : node,
					relocating_node : null,
					shard           : shard,
					index           : index
				});

				// Generate Replica Shards
				_.times(options.replicas, function () {
					var shardState      = (options.nodes < 2) ? 'UNASSIGNED' : 'STARTED';
					var replicaNode     = (options.nodes < 2) ? null : getNode();
					var shardCollection = (options.nodes < 2) ? state.routing_nodes.unassigned : state.routing_nodes.nodes[replicaNode];
					shardCollection.push({
						state           : shardState,
						primary         : false,
						node            : replicaNode,
						relocating_node : null,
						shard           : shard,
						index           : index
					});
				});

			});
		});
		return state;
	};
});
