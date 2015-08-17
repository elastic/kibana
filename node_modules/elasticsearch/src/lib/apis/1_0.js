/* jshint maxlen: false */

var ca = require('../client_action').factory;
var namespace = require('../client_action').namespaceFactory;
var api = module.exports = {};

api._namespaces = ['cat', 'cluster', 'indices', 'nodes', 'snapshot'];

/**
 * Perform a [bulk](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-bulk.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.consistency - Explicit write consistency setting for the operation
 * @param {Boolean} params.refresh - Refresh the index after performing the operation
 * @param {String} [params.replication=sync] - Explicitely set the replication type
 * @param {String} params.routing - Specific routing value
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {String} params.type - Default document type for items which don't provide one
 * @param {String} params.index - Default index for items which don't provide one
 */
api.bulk = ca({
  params: {
    consistency: {
      type: 'enum',
      options: [
        'one',
        'quorum',
        'all'
      ]
    },
    refresh: {
      type: 'boolean'
    },
    replication: {
      type: 'enum',
      'default': 'sync',
      options: [
        'sync',
        'async'
      ]
    },
    routing: {
      type: 'string'
    },
    timeout: {
      type: 'time'
    },
    type: {
      type: 'string'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_bulk',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_bulk',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_bulk'
    }
  ],
  needBody: true,
  bulkBody: true,
  method: 'POST'
});

api.cat = namespace();

/**
 * Perform a [cat.aliases](http://www.elasticsearch.org/guide/en/elasticsearch/reference/master/cat.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.name - A comma-separated list of alias names to return
 */
api.cat.prototype.aliases = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/aliases/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/aliases'
    }
  ]
});

/**
 * Perform a [cat.allocation](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-allocation.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.bytes - The unit in which to display byte values
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to limit the returned information
 */
api.cat.prototype.allocation = ca({
  params: {
    bytes: {
      type: 'enum',
      options: [
        'b',
        'k',
        'm',
        'g'
      ]
    },
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/allocation/<%=nodeId%>',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/allocation'
    }
  ]
});

/**
 * Perform a [cat.count](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-count.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to limit the returned information
 */
api.cat.prototype.count = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/count/<%=index%>',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/count'
    }
  ]
});

/**
 * Perform a [cat.health](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-health.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} [params.ts=true] - Set to false to disable timestamping
 * @param {Boolean} params.v - Verbose mode. Display column headers
 */
api.cat.prototype.health = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    ts: {
      type: 'boolean',
      'default': true
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  url: {
    fmt: '/_cat/health'
  }
});

/**
 * Perform a [cat.help](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.help - Return help information
 */
api.cat.prototype.help = ca({
  params: {
    help: {
      type: 'boolean',
      'default': false
    }
  },
  url: {
    fmt: '/_cat'
  }
});

/**
 * Perform a [cat.indices](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-indices.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.bytes - The unit in which to display byte values
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.pri - Set to true to return stats only for primary shards
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to limit the returned information
 */
api.cat.prototype.indices = ca({
  params: {
    bytes: {
      type: 'enum',
      options: [
        'b',
        'k',
        'm',
        'g'
      ]
    },
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    pri: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/indices/<%=index%>',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/indices'
    }
  ]
});

/**
 * Perform a [cat.master](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-master.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 */
api.cat.prototype.master = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  url: {
    fmt: '/_cat/master'
  }
});

/**
 * Perform a [cat.nodes](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-nodes.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 */
api.cat.prototype.nodes = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  url: {
    fmt: '/_cat/nodes'
  }
});

/**
 * Perform a [cat.pendingTasks](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-pending-tasks.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 */
api.cat.prototype.pendingTasks = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  url: {
    fmt: '/_cat/pending_tasks'
  }
});

/**
 * Perform a [cat.recovery](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-recovery.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.bytes - The unit in which to display byte values
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to limit the returned information
 */
api.cat.prototype.recovery = ca({
  params: {
    bytes: {
      type: 'enum',
      options: [
        'b',
        'k',
        'm',
        'g'
      ]
    },
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/recovery/<%=index%>',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/recovery'
    }
  ]
});

/**
 * Perform a [cat.shards](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cat-shards.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to limit the returned information
 */
api.cat.prototype.shards = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cat/shards/<%=index%>',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cat/shards'
    }
  ]
});

/**
 * Perform a [cat.threadPool](http://www.elasticsearch.org/guide/en/elasticsearch/reference/master/cat-thread-pool.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String, String[], Boolean} params.h - Comma-separated list of column names to display
 * @param {Boolean} params.help - Return help information
 * @param {Boolean} params.v - Verbose mode. Display column headers
 * @param {Boolean} params.fullId - Enables displaying the complete node ids
 */
api.cat.prototype.threadPool = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    h: {
      type: 'list'
    },
    help: {
      type: 'boolean',
      'default': false
    },
    v: {
      type: 'boolean',
      'default': false
    },
    fullId: {
      type: 'boolean',
      'default': false,
      name: 'full_id'
    }
  },
  url: {
    fmt: '/_cat/thread_pool'
  }
});

/**
 * Perform a [clearScroll](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-request-scroll.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.scrollId - A comma-separated list of scroll IDs to clear
 */
api.clearScroll = ca({
  urls: [
    {
      fmt: '/_search/scroll/<%=scrollId%>',
      req: {
        scrollId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_search/scroll'
    }
  ],
  method: 'DELETE'
});

api.cluster = namespace();

/**
 * Perform a [cluster.getSettings](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-update-settings.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Date, Number} params.timeout - Explicit operation timeout
 */
api.cluster.prototype.getSettings = ca({
  params: {
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    timeout: {
      type: 'time'
    }
  },
  url: {
    fmt: '/_cluster/settings'
  }
});

/**
 * Perform a [cluster.health](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-health.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} [params.level=cluster] - Specify the level of detail for returned information
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Number} params.waitForActiveShards - Wait until the specified number of shards is active
 * @param {String} params.waitForNodes - Wait until the specified number of nodes is available
 * @param {Number} params.waitForRelocatingShards - Wait until the specified number of relocating shards is finished
 * @param {String} params.waitForStatus - Wait until cluster is in a specific state
 * @param {String} params.index - Limit the information returned to a specific index
 */
api.cluster.prototype.health = ca({
  params: {
    level: {
      type: 'enum',
      'default': 'cluster',
      options: [
        'cluster',
        'indices',
        'shards'
      ]
    },
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    timeout: {
      type: 'time'
    },
    waitForActiveShards: {
      type: 'number',
      name: 'wait_for_active_shards'
    },
    waitForNodes: {
      type: 'string',
      name: 'wait_for_nodes'
    },
    waitForRelocatingShards: {
      type: 'number',
      name: 'wait_for_relocating_shards'
    },
    waitForStatus: {
      type: 'enum',
      'default': null,
      options: [
        'green',
        'yellow',
        'red'
      ],
      name: 'wait_for_status'
    }
  },
  urls: [
    {
      fmt: '/_cluster/health/<%=index%>',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_cluster/health'
    }
  ]
});

/**
 * Perform a [cluster.pendingTasks](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-pending.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 */
api.cluster.prototype.pendingTasks = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/_cluster/pending_tasks'
  }
});

/**
 * Perform a [cluster.putSettings](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-update-settings.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 */
api.cluster.prototype.putSettings = ca({
  params: {
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    }
  },
  url: {
    fmt: '/_cluster/settings'
  },
  method: 'PUT'
});

/**
 * Perform a [cluster.reroute](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-reroute.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.dryRun - Simulate the operation only and return the resulting state
 * @param {Boolean} params.filterMetadata - Don't return cluster state metadata (default: false)
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Date, Number} params.timeout - Explicit operation timeout
 */
api.cluster.prototype.reroute = ca({
  params: {
    dryRun: {
      type: 'boolean',
      name: 'dry_run'
    },
    filterMetadata: {
      type: 'boolean',
      name: 'filter_metadata'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    timeout: {
      type: 'time'
    }
  },
  url: {
    fmt: '/_cluster/reroute'
  },
  method: 'POST'
});

/**
 * Perform a [cluster.state](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-state.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.indexTemplates - A comma separated list to return specific index templates when returning metadata
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 * @param {String, String[], Boolean} params.metric - Limit the information returned to the specified metrics
 */
api.cluster.prototype.state = ca({
  params: {
    local: {
      type: 'boolean'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    indexTemplates: {
      type: 'list',
      name: 'index_templates'
    },
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    }
  },
  urls: [
    {
      fmt: '/_cluster/state/<%=metric%>/<%=index%>',
      req: {
        metric: {
          type: 'list',
          options: [
            '_all',
            'blocks',
            'metadata',
            'nodes',
            'routing_table',
            'master_node',
            'version'
          ]
        },
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cluster/state/<%=metric%>',
      req: {
        metric: {
          type: 'list',
          options: [
            '_all',
            'blocks',
            'metadata',
            'nodes',
            'routing_table',
            'master_node',
            'version'
          ]
        }
      }
    },
    {
      fmt: '/_cluster/state'
    }
  ]
});

/**
 * Perform a [cluster.stats](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-stats.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to limit the returned information; use `_local` to return information from the node you're connecting to, leave empty to get information from all nodes
 */
api.cluster.prototype.stats = ca({
  params: {
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    },
    human: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_cluster/stats/nodes/<%=nodeId%>',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cluster/stats'
    }
  ]
});

/**
 * Perform a [count](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-count.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Number} params.minScore - Include only documents with a specific `_score` value in the result
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {String} params.routing - Specific routing value
 * @param {String} params.source - The URL-encoded query definition (instead of using the request body)
 * @param {String, String[], Boolean} params.index - A comma-separated list of indices to restrict the results
 * @param {String, String[], Boolean} params.type - A comma-separated list of types to restrict the results
 */
api.count = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    minScore: {
      type: 'number',
      name: 'min_score'
    },
    preference: {
      type: 'string'
    },
    routing: {
      type: 'string'
    },
    source: {
      type: 'string'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_count',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_count',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_count'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [countPercolate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-percolate.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.routing - A comma-separated list of specific routing values
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.percolateIndex - The index to count percolate the document into. Defaults to index.
 * @param {String} params.percolateType - The type to count percolate document into. Defaults to type.
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.index - The index of the document being count percolated.
 * @param {String} params.type - The type of the document being count percolated.
 * @param {String} params.id - Substitute the document in the request body with a document that is known by the specified id. On top of the id, the index and type parameter will be used to retrieve the document from within the cluster.
 */
api.countPercolate = ca({
  params: {
    routing: {
      type: 'list'
    },
    preference: {
      type: 'string'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    percolateIndex: {
      type: 'string',
      name: 'percolate_index'
    },
    percolateType: {
      type: 'string',
      name: 'percolate_type'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/<%=id%>/_percolate/count',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        id: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/<%=type%>/_percolate/count',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    }
  ],
  method: 'POST'
});

/**
 * Perform a [delete](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-delete.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.consistency - Specific write consistency setting for the operation
 * @param {String} params.parent - ID of parent document
 * @param {Boolean} params.refresh - Refresh the index after performing the operation
 * @param {String} [params.replication=sync] - Specific replication type
 * @param {String} params.routing - Specific routing value
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api['delete'] = ca({
  params: {
    consistency: {
      type: 'enum',
      options: [
        'one',
        'quorum',
        'all'
      ]
    },
    parent: {
      type: 'string'
    },
    refresh: {
      type: 'boolean'
    },
    replication: {
      type: 'enum',
      'default': 'sync',
      options: [
        'sync',
        'async'
      ]
    },
    routing: {
      type: 'string'
    },
    timeout: {
      type: 'time'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [deleteByQuery](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-delete-by-query.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.analyzer - The analyzer to use for the query string
 * @param {String} params.consistency - Specific write consistency setting for the operation
 * @param {String} [params.defaultOperator=OR] - The default operator for query string query (AND or OR)
 * @param {String} params.df - The field to use as default where no field prefix is given in the query string
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} [params.replication=sync] - Specific replication type
 * @param {String} params.q - Query in the Lucene query string syntax
 * @param {String} params.routing - Specific routing value
 * @param {String} params.source - The URL-encoded query definition (instead of using the request body)
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {String, String[], Boolean} params.index - A comma-separated list of indices to restrict the operation; use `_all` to perform the operation on all indices
 * @param {String, String[], Boolean} params.type - A comma-separated list of types to restrict the operation
 */
api.deleteByQuery = ca({
  params: {
    analyzer: {
      type: 'string'
    },
    consistency: {
      type: 'enum',
      options: [
        'one',
        'quorum',
        'all'
      ]
    },
    defaultOperator: {
      type: 'enum',
      'default': 'OR',
      options: [
        'AND',
        'OR'
      ],
      name: 'default_operator'
    },
    df: {
      type: 'string'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    replication: {
      type: 'enum',
      'default': 'sync',
      options: [
        'sync',
        'async'
      ]
    },
    q: {
      type: 'string'
    },
    routing: {
      type: 'string'
    },
    source: {
      type: 'string'
    },
    timeout: {
      type: 'time'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_query',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_query',
      req: {
        index: {
          type: 'list'
        }
      }
    }
  ],
  method: 'DELETE'
});

/**
 * Perform a [exists](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-get.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.parent - The ID of the parent document
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.realtime - Specify whether to perform the operation in realtime or search mode
 * @param {Boolean} params.refresh - Refresh the shard containing the document before performing the operation
 * @param {String} params.routing - Specific routing value
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document (use `_all` to fetch the first document matching the ID across all types)
 */
api.exists = ca({
  params: {
    parent: {
      type: 'string'
    },
    preference: {
      type: 'string'
    },
    realtime: {
      type: 'boolean'
    },
    refresh: {
      type: 'boolean'
    },
    routing: {
      type: 'string'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'HEAD'
});

/**
 * Perform a [explain](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-explain.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.analyzeWildcard - Specify whether wildcards and prefix queries in the query string query should be analyzed (default: false)
 * @param {String} params.analyzer - The analyzer for the query string query
 * @param {String} [params.defaultOperator=OR] - The default operator for query string query (AND or OR)
 * @param {String} params.df - The default field for query string query (default: _all)
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return in the response
 * @param {Boolean} params.lenient - Specify whether format-based query failures (such as providing text to a numeric field) should be ignored
 * @param {Boolean} params.lowercaseExpandedTerms - Specify whether query terms should be lowercased
 * @param {String} params.parent - The ID of the parent document
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {String} params.q - Query in the Lucene query string syntax
 * @param {String} params.routing - Specific routing value
 * @param {String} params.source - The URL-encoded query definition (instead of using the request body)
 * @param {String, String[], Boolean} params._source - True or false to return the _source field or not, or a list of fields to return
 * @param {String, String[], Boolean} params._sourceExclude - A list of fields to exclude from the returned _source field
 * @param {String, String[], Boolean} params._sourceInclude - A list of fields to extract and return from the _source field
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.explain = ca({
  params: {
    analyzeWildcard: {
      type: 'boolean',
      name: 'analyze_wildcard'
    },
    analyzer: {
      type: 'string'
    },
    defaultOperator: {
      type: 'enum',
      'default': 'OR',
      options: [
        'AND',
        'OR'
      ],
      name: 'default_operator'
    },
    df: {
      type: 'string'
    },
    fields: {
      type: 'list'
    },
    lenient: {
      type: 'boolean'
    },
    lowercaseExpandedTerms: {
      type: 'boolean',
      name: 'lowercase_expanded_terms'
    },
    parent: {
      type: 'string'
    },
    preference: {
      type: 'string'
    },
    q: {
      type: 'string'
    },
    routing: {
      type: 'string'
    },
    source: {
      type: 'string'
    },
    _source: {
      type: 'list'
    },
    _sourceExclude: {
      type: 'list',
      name: '_source_exclude'
    },
    _sourceInclude: {
      type: 'list',
      name: '_source_include'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>/_explain',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [get](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-get.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return in the response
 * @param {String} params.parent - The ID of the parent document
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.realtime - Specify whether to perform the operation in realtime or search mode
 * @param {Boolean} params.refresh - Refresh the shard containing the document before performing the operation
 * @param {String} params.routing - Specific routing value
 * @param {String, String[], Boolean} params._source - True or false to return the _source field or not, or a list of fields to return
 * @param {String, String[], Boolean} params._sourceExclude - A list of fields to exclude from the returned _source field
 * @param {String, String[], Boolean} params._sourceInclude - A list of fields to extract and return from the _source field
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document (use `_all` to fetch the first document matching the ID across all types)
 */
api.get = ca({
  params: {
    fields: {
      type: 'list'
    },
    parent: {
      type: 'string'
    },
    preference: {
      type: 'string'
    },
    realtime: {
      type: 'boolean'
    },
    refresh: {
      type: 'boolean'
    },
    routing: {
      type: 'string'
    },
    _source: {
      type: 'list'
    },
    _sourceExclude: {
      type: 'list',
      name: '_source_exclude'
    },
    _sourceInclude: {
      type: 'list',
      name: '_source_include'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  }
});

/**
 * Perform a [getSource](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-get.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.parent - The ID of the parent document
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.realtime - Specify whether to perform the operation in realtime or search mode
 * @param {Boolean} params.refresh - Refresh the shard containing the document before performing the operation
 * @param {String} params.routing - Specific routing value
 * @param {String, String[], Boolean} params._source - True or false to return the _source field or not, or a list of fields to return
 * @param {String, String[], Boolean} params._sourceExclude - A list of fields to exclude from the returned _source field
 * @param {String, String[], Boolean} params._sourceInclude - A list of fields to extract and return from the _source field
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document; use `_all` to fetch the first document matching the ID across all types
 */
api.getSource = ca({
  params: {
    parent: {
      type: 'string'
    },
    preference: {
      type: 'string'
    },
    realtime: {
      type: 'boolean'
    },
    refresh: {
      type: 'boolean'
    },
    routing: {
      type: 'string'
    },
    _source: {
      type: 'list'
    },
    _sourceExclude: {
      type: 'list',
      name: '_source_exclude'
    },
    _sourceInclude: {
      type: 'list',
      name: '_source_include'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>/_source',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  }
});

/**
 * Perform a [index](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-index_.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.consistency - Explicit write consistency setting for the operation
 * @param {String} params.parent - ID of the parent document
 * @param {Boolean} params.refresh - Refresh the index after performing the operation
 * @param {String} [params.replication=sync] - Specific replication type
 * @param {String} params.routing - Specific routing value
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.timestamp - Explicit timestamp for the document
 * @param {Duration} params.ttl - Expiration time for the document
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - Document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.index = ca({
  params: {
    consistency: {
      type: 'enum',
      options: [
        'one',
        'quorum',
        'all'
      ]
    },
    opType: {
      type: 'enum',
      'default': 'index',
      options: [
        'index',
        'create'
      ],
      name: 'op_type'
    },
    parent: {
      type: 'string'
    },
    refresh: {
      type: 'boolean'
    },
    replication: {
      type: 'enum',
      'default': 'sync',
      options: [
        'sync',
        'async'
      ]
    },
    routing: {
      type: 'string'
    },
    timeout: {
      type: 'time'
    },
    timestamp: {
      type: 'time'
    },
    ttl: {
      type: 'duration'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/<%=id%>',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        id: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/<%=type%>',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    }
  ],
  needBody: true,
  method: 'POST'
});

api.indices = namespace();

/**
 * Perform a [indices.analyze](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-analyze.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.analyzer - The name of the analyzer to use
 * @param {String} params.field - Use the analyzer configured for this field (instead of passing the analyzer name)
 * @param {String, String[], Boolean} params.filters - A comma-separated list of filters to use for the analysis
 * @param {String} params.index - The name of the index to scope the operation
 * @param {Boolean} params.preferLocal - With `true`, specify that a local shard should be used if available, with `false`, use a random shard (default: true)
 * @param {String} params.text - The text on which the analysis should be performed (when request body is not used)
 * @param {String} params.tokenizer - The name of the tokenizer to use for the analysis
 * @param {String} [params.format=detailed] - Format of the output
 */
api.indices.prototype.analyze = ca({
  params: {
    analyzer: {
      type: 'string'
    },
    field: {
      type: 'string'
    },
    filters: {
      type: 'list'
    },
    index: {
      type: 'string'
    },
    preferLocal: {
      type: 'boolean',
      name: 'prefer_local'
    },
    text: {
      type: 'string'
    },
    tokenizer: {
      type: 'string'
    },
    format: {
      type: 'enum',
      'default': 'detailed',
      options: [
        'detailed',
        'text'
      ]
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_analyze',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_analyze'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.clearCache](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-clearcache.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.fieldData - Clear field data
 * @param {Boolean} params.fielddata - Clear field data
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to clear when using the `field_data` parameter (default: all)
 * @param {Boolean} params.filter - Clear filter caches
 * @param {Boolean} params.filterCache - Clear filter caches
 * @param {Boolean} params.filterKeys - A comma-separated list of keys to clear when using the `filter_cache` parameter (default: all)
 * @param {Boolean} params.id - Clear ID caches for parent/child
 * @param {Boolean} params.idCache - Clear ID caches for parent/child
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index name to limit the operation
 * @param {Boolean} params.recycler - Clear the recycler cache
 */
api.indices.prototype.clearCache = ca({
  params: {
    fieldData: {
      type: 'boolean',
      name: 'field_data'
    },
    fielddata: {
      type: 'boolean'
    },
    fields: {
      type: 'list'
    },
    filter: {
      type: 'boolean'
    },
    filterCache: {
      type: 'boolean',
      name: 'filter_cache'
    },
    filterKeys: {
      type: 'boolean',
      name: 'filter_keys'
    },
    id: {
      type: 'boolean'
    },
    idCache: {
      type: 'boolean',
      name: 'id_cache'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    index: {
      type: 'list'
    },
    recycler: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_cache/clear',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_cache/clear'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.close](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-open-close.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.index - The name of the index
 */
api.indices.prototype.close = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  url: {
    fmt: '/<%=index%>/_close',
    req: {
      index: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [indices.create](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-create-index.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String} params.index - The name of the index
 */
api.indices.prototype.create = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/<%=index%>',
    req: {
      index: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [indices.delete](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-delete-index.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.index - A comma-separated list of indices to delete; use `_all` or `*` string to delete all indices
 */
api.indices.prototype['delete'] = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/<%=index%>',
    req: {
      index: {
        type: 'list'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [indices.deleteAlias](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit timestamp for the document
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names (supports wildcards); use `_all` for all indices
 * @param {String, String[], Boolean} params.name - A comma-separated list of aliases to delete (supports wildcards); use `_all` to delete all aliases for the specified indices.
 */
api.indices.prototype.deleteAlias = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/<%=index%>/_alias/<%=name%>',
    req: {
      index: {
        type: 'list'
      },
      name: {
        type: 'list'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [indices.deleteMapping](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-delete-mapping.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names (supports wildcards); use `_all` for all indices
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to delete (supports wildcards); use `_all` to delete all document types in the specified indices.
 */
api.indices.prototype.deleteMapping = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/_mapping',
    req: {
      index: {
        type: 'list'
      },
      type: {
        type: 'list'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [indices.deleteTemplate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-templates.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String} params.name - The name of the template
 */
api.indices.prototype.deleteTemplate = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/_template/<%=name%>',
    req: {
      name: {
        type: 'string'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [indices.deleteWarmer](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-warmers.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.name - A comma-separated list of warmer names to delete (supports wildcards); use `_all` to delete all warmers in the specified indices. You must specify a name either in the uri or in the parameters.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to delete warmers from (supports wildcards); use `_all` to perform the operation on all indices.
 */
api.indices.prototype.deleteWarmer = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    name: {
      type: 'list'
    }
  },
  url: {
    fmt: '/<%=index%>/_warmer/<%=name%>',
    req: {
      index: {
        type: 'list'
      },
      name: {
        type: 'list'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [indices.exists](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-get-settings.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of indices to check
 */
api.indices.prototype.exists = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  url: {
    fmt: '/<%=index%>',
    req: {
      index: {
        type: 'list'
      }
    }
  },
  method: 'HEAD'
});

/**
 * Perform a [indices.existsAlias](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open,closed] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to filter aliases
 * @param {String, String[], Boolean} params.name - A comma-separated list of alias names to return
 */
api.indices.prototype.existsAlias = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': [
        'open',
        'closed'
      ],
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_alias/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_alias/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_alias',
      req: {
        index: {
          type: 'list'
        }
      }
    }
  ],
  method: 'HEAD'
});

/**
 * Perform a [indices.existsTemplate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-templates.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String} params.name - The name of the template
 */
api.indices.prototype.existsTemplate = ca({
  params: {
    local: {
      type: 'boolean'
    }
  },
  url: {
    fmt: '/_template/<%=name%>',
    req: {
      name: {
        type: 'string'
      }
    }
  },
  method: 'HEAD'
});

/**
 * Perform a [indices.existsType](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-types-exists.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` to check the types across all indices
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to check
 */
api.indices.prototype.existsType = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>',
    req: {
      index: {
        type: 'list'
      },
      type: {
        type: 'list'
      }
    }
  },
  method: 'HEAD'
});

/**
 * Perform a [indices.flush](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-flush.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.force - Whether a flush should be forced even if it is not necessarily needed ie. if no changes will be committed to the index. This is useful if transaction log IDs should be incremented even if no uncommitted changes are present. (This setting can be considered as internal)
 * @param {Boolean} params.full - If set to true a new index writer is created and settings that have been changed related to the index writer will be refreshed. Note: if a full flush is required for a setting to take effect this will be part of the settings update process and it not required to be executed by the user. (This setting can be considered as internal)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string for all indices
 */
api.indices.prototype.flush = ca({
  params: {
    force: {
      type: 'boolean'
    },
    full: {
      type: 'boolean'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_flush',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_flush'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.getAlias](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to filter aliases
 * @param {String, String[], Boolean} params.name - A comma-separated list of alias names to return
 */
api.indices.prototype.getAlias = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_alias/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_alias/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_alias',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_alias'
    }
  ]
});

/**
 * Perform a [indices.getAliases](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to filter aliases
 * @param {String, String[], Boolean} params.name - A comma-separated list of alias names to filter
 */
api.indices.prototype.getAliases = ca({
  params: {
    timeout: {
      type: 'time'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_aliases/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_aliases',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_aliases/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_aliases'
    }
  ]
});

/**
 * Perform a [indices.getFieldMapping](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-get-field-mapping.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.includeDefaults - Whether the default mapping values should be returned as well
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types
 * @param {String, String[], Boolean} params.field - A comma-separated list of fields
 */
api.indices.prototype.getFieldMapping = ca({
  params: {
    includeDefaults: {
      type: 'boolean',
      name: 'include_defaults'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_mapping/<%=type%>/field/<%=field%>',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        },
        field: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_mapping/field/<%=field%>',
      req: {
        index: {
          type: 'list'
        },
        field: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_mapping/<%=type%>/field/<%=field%>',
      req: {
        type: {
          type: 'list'
        },
        field: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_mapping/field/<%=field%>',
      req: {
        field: {
          type: 'list'
        }
      }
    }
  ]
});

/**
 * Perform a [indices.getMapping](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-get-mapping.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types
 */
api.indices.prototype.getMapping = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_mapping/<%=type%>',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_mapping',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_mapping/<%=type%>',
      req: {
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_mapping'
    }
  ]
});

/**
 * Perform a [indices.getSettings](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-get-mapping.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open,closed] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 * @param {String, String[], Boolean} params.name - The name of the settings that should be included
 */
api.indices.prototype.getSettings = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': [
        'open',
        'closed'
      ],
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_settings/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_settings',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_settings/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_settings'
    }
  ]
});

/**
 * Perform a [indices.getTemplate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-templates.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String} params.name - The name of the template
 */
api.indices.prototype.getTemplate = ca({
  params: {
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/_template/<%=name%>',
      req: {
        name: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_template'
    }
  ]
});

/**
 * Perform a [indices.getWarmer](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-warmers.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to restrict the operation; use `_all` to perform the operation on all indices
 * @param {String, String[], Boolean} params.name - The name of the warmer (supports wildcards); leave empty to get all warmers
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to restrict the operation; leave empty to perform the operation on all types
 */
api.indices.prototype.getWarmer = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_warmer/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_warmer/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_warmer',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_warmer/<%=name%>',
      req: {
        name: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_warmer'
    }
  ]
});

/**
 * Perform a [indices.open](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-open-close.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=closed] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.index - The name of the index
 */
api.indices.prototype.open = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'closed',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  url: {
    fmt: '/<%=index%>/_open',
    req: {
      index: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [indices.optimize](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-optimize.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flush - Specify whether the index should be flushed after performing the operation (default: true)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Number} params.maxNumSegments - The number of segments the index should be merged into (default: dynamic)
 * @param {Boolean} params.onlyExpungeDeletes - Specify whether the operation should only expunge deleted documents
 * @param {Anything} params.operationThreading - TODO: ?
 * @param {Boolean} params.waitForMerge - Specify whether the request should block until the merge process is finished (default: true)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 */
api.indices.prototype.optimize = ca({
  params: {
    flush: {
      type: 'boolean'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    maxNumSegments: {
      type: 'number',
      name: 'max_num_segments'
    },
    onlyExpungeDeletes: {
      type: 'boolean',
      name: 'only_expunge_deletes'
    },
    operationThreading: {
      name: 'operation_threading'
    },
    waitForMerge: {
      type: 'boolean',
      name: 'wait_for_merge'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_optimize',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_optimize'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.putAlias](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Explicit timestamp for the document
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names the alias should point to (supports wildcards); use `_all` or omit to perform the operation on all indices.
 * @param {String} params.name - The name of the alias to be created or updated
 */
api.indices.prototype.putAlias = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_alias/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_alias/<%=name%>',
      req: {
        name: {
          type: 'string'
        }
      }
    }
  ],
  method: 'PUT'
});

/**
 * Perform a [indices.putMapping](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-put-mapping.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreConflicts - Specify whether to ignore conflicts while updating the mapping (default: false)
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names the mapping should be added to (supports wildcards); use `_all` or omit to add the mapping on all indices.
 * @param {String} params.type - The name of the document type
 */
api.indices.prototype.putMapping = ca({
  params: {
    ignoreConflicts: {
      type: 'boolean',
      name: 'ignore_conflicts'
    },
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_mapping/<%=type%>',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_mapping/<%=type%>',
      req: {
        type: {
          type: 'string'
        }
      }
    }
  ],
  needBody: true,
  method: 'PUT'
});

/**
 * Perform a [indices.putSettings](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-update-settings.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 */
api.indices.prototype.putSettings = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_settings',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_settings'
    }
  ],
  needBody: true,
  method: 'PUT'
});

/**
 * Perform a [indices.putTemplate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-templates.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Number} params.order - The order for this template when merging multiple matching ones (higher numbers are merged later, overriding the lower numbers)
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {String} params.name - The name of the template
 */
api.indices.prototype.putTemplate = ca({
  params: {
    order: {
      type: 'number'
    },
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    }
  },
  url: {
    fmt: '/_template/<%=name%>',
    req: {
      name: {
        type: 'string'
      }
    }
  },
  needBody: true,
  method: 'PUT'
});

/**
 * Perform a [indices.putWarmer](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-warmers.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed) in the search request to warm
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices in the search request to warm. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both, in the search request to warm.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to register the warmer for; use `_all` or omit to perform the operation on all indices
 * @param {String} params.name - The name of the warmer
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to register the warmer for; leave empty to perform the operation on all types
 */
api.indices.prototype.putWarmer = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_warmer/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        },
        name: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_warmer/<%=name%>',
      req: {
        index: {
          type: 'list'
        },
        name: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_warmer/<%=name%>',
      req: {
        name: {
          type: 'string'
        }
      }
    }
  ],
  needBody: true,
  method: 'PUT'
});

/**
 * Perform a [indices.refresh](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-refresh.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.force - Force a refresh even if not required
 * @param {Anything} params.operationThreading - TODO: ?
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 */
api.indices.prototype.refresh = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    force: {
      type: 'boolean',
      'default': false
    },
    operationThreading: {
      name: 'operation_threading'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_refresh',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_refresh'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.segments](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-segments.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {Anything} params.operationThreading - TODO: ?
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 */
api.indices.prototype.segments = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    human: {
      type: 'boolean',
      'default': false
    },
    operationThreading: {
      name: 'operation_threading'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_segments',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_segments'
    }
  ]
});

/**
 * Perform a [indices.snapshotIndex](http://www.elasticsearch.org/guide/en/elasticsearch/reference/0.90/indices-gateway-snapshot.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string for all indices
 */
api.indices.prototype.snapshotIndex = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_gateway/snapshot',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_gateway/snapshot'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [indices.stats](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-stats.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.completionFields - A comma-separated list of fields for `fielddata` and `suggest` index metric (supports wildcards)
 * @param {String, String[], Boolean} params.fielddataFields - A comma-separated list of fields for `fielddata` index metric (supports wildcards)
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields for `fielddata` and `completion` index metric (supports wildcards)
 * @param {Boolean} params.groups - A comma-separated list of search groups for `search` index metric
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {String} [params.level=indices] - Return stats aggregated at cluster, index or shard level
 * @param {String, String[], Boolean} params.types - A comma-separated list of document types for the `indexing` index metric
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 * @param {String, String[], Boolean} params.metric - Limit the information returned the specific metrics.
 */
api.indices.prototype.stats = ca({
  params: {
    completionFields: {
      type: 'list',
      name: 'completion_fields'
    },
    fielddataFields: {
      type: 'list',
      name: 'fielddata_fields'
    },
    fields: {
      type: 'list'
    },
    groups: {
      type: 'boolean'
    },
    human: {
      type: 'boolean',
      'default': false
    },
    level: {
      type: 'enum',
      'default': 'indices',
      options: [
        'cluster',
        'indices',
        'shards'
      ]
    },
    types: {
      type: 'list'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_stats/<%=metric%>',
      req: {
        index: {
          type: 'list'
        },
        metric: {
          type: 'list',
          options: [
            '_all',
            'completion',
            'docs',
            'fielddata',
            'filter_cache',
            'flush',
            'get',
            'id_cache',
            'indexing',
            'merge',
            'percolate',
            'refresh',
            'search',
            'segments',
            'store',
            'warmer'
          ]
        }
      }
    },
    {
      fmt: '/_stats/<%=metric%>',
      req: {
        metric: {
          type: 'list',
          options: [
            '_all',
            'completion',
            'docs',
            'fielddata',
            'filter_cache',
            'flush',
            'get',
            'id_cache',
            'indexing',
            'merge',
            'percolate',
            'refresh',
            'search',
            'segments',
            'store',
            'warmer'
          ]
        }
      }
    },
    {
      fmt: '/<%=index%>/_stats',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_stats'
    }
  ]
});

/**
 * Perform a [indices.status](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-status.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {Anything} params.operationThreading - TODO: ?
 * @param {Boolean} params.recovery - Return information about shard recovery
 * @param {Boolean} params.snapshot - TODO: ?
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices
 */
api.indices.prototype.status = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    human: {
      type: 'boolean',
      'default': false
    },
    operationThreading: {
      name: 'operation_threading'
    },
    recovery: {
      type: 'boolean'
    },
    snapshot: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_status',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_status'
    }
  ]
});

/**
 * Perform a [indices.updateAliases](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-aliases.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.timeout - Request timeout
 * @param {Date, Number} params.masterTimeout - Specify timeout for connection to master
 */
api.indices.prototype.updateAliases = ca({
  params: {
    timeout: {
      type: 'time'
    },
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/_aliases'
  },
  needBody: true,
  method: 'POST'
});

/**
 * Perform a [indices.validateQuery](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-validate.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.explain - Return detailed information about the error
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {Anything} params.operationThreading - TODO: ?
 * @param {String} params.source - The URL-encoded query definition (instead of using the request body)
 * @param {String} params.q - Query in the Lucene query string syntax
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to restrict the operation; use `_all` or empty string to perform the operation on all indices
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to restrict the operation; leave empty to perform the operation on all types
 */
api.indices.prototype.validateQuery = ca({
  params: {
    explain: {
      type: 'boolean'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    operationThreading: {
      name: 'operation_threading'
    },
    source: {
      type: 'string'
    },
    q: {
      type: 'string'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_validate/query',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_validate/query',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_validate/query'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [info](http://www.elasticsearch.org/guide/) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 */
api.info = ca({
  url: {
    fmt: '/'
  }
});

/**
 * Perform a [mget](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-multi-get.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return in the response
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.realtime - Specify whether to perform the operation in realtime or search mode
 * @param {Boolean} params.refresh - Refresh the shard containing the document before performing the operation
 * @param {String, String[], Boolean} params._source - True or false to return the _source field or not, or a list of fields to return
 * @param {String, String[], Boolean} params._sourceExclude - A list of fields to exclude from the returned _source field
 * @param {String, String[], Boolean} params._sourceInclude - A list of fields to extract and return from the _source field
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.mget = ca({
  params: {
    fields: {
      type: 'list'
    },
    preference: {
      type: 'string'
    },
    realtime: {
      type: 'boolean'
    },
    refresh: {
      type: 'boolean'
    },
    _source: {
      type: 'list'
    },
    _sourceExclude: {
      type: 'list',
      name: '_source_exclude'
    },
    _sourceInclude: {
      type: 'list',
      name: '_source_include'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_mget',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_mget',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_mget'
    }
  ],
  needBody: true,
  method: 'POST'
});

/**
 * Perform a [mlt](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-more-like-this.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Number} params.boostTerms - The boost factor
 * @param {Number} params.maxDocFreq - The word occurrence frequency as count: words with higher occurrence in the corpus will be ignored
 * @param {Number} params.maxQueryTerms - The maximum query terms to be included in the generated query
 * @param {Number} params.maxWordLength - The minimum length of the word: longer words will be ignored
 * @param {Number} params.minDocFreq - The word occurrence frequency as count: words with lower occurrence in the corpus will be ignored
 * @param {Number} params.minTermFreq - The term frequency as percent: terms with lower occurence in the source document will be ignored
 * @param {Number} params.minWordLength - The minimum length of the word: shorter words will be ignored
 * @param {String, String[], Boolean} params.mltFields - Specific fields to perform the query against
 * @param {Number} params.percentTermsToMatch - How many terms have to match in order to consider the document a match (default: 0.3)
 * @param {String} params.routing - Specific routing value
 * @param {Number} params.searchFrom - The offset from which to return results
 * @param {String, String[], Boolean} params.searchIndices - A comma-separated list of indices to perform the query against (default: the index containing the document)
 * @param {String} params.searchQueryHint - The search query hint
 * @param {String} params.searchScroll - A scroll search request definition
 * @param {Number} params.searchSize - The number of documents to return (default: 10)
 * @param {String} params.searchSource - A specific search request definition (instead of using the request body)
 * @param {String} params.searchType - Specific search type (eg. `dfs_then_fetch`, `count`, etc)
 * @param {String, String[], Boolean} params.searchTypes - A comma-separated list of types to perform the query against (default: the same type as the document)
 * @param {String, String[], Boolean} params.stopWords - A list of stop words to be ignored
 * @param {String} params.id - The document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document (use `_all` to fetch the first document matching the ID across all types)
 */
api.mlt = ca({
  params: {
    boostTerms: {
      type: 'number',
      name: 'boost_terms'
    },
    maxDocFreq: {
      type: 'number',
      name: 'max_doc_freq'
    },
    maxQueryTerms: {
      type: 'number',
      name: 'max_query_terms'
    },
    maxWordLength: {
      type: 'number',
      name: 'max_word_length'
    },
    minDocFreq: {
      type: 'number',
      name: 'min_doc_freq'
    },
    minTermFreq: {
      type: 'number',
      name: 'min_term_freq'
    },
    minWordLength: {
      type: 'number',
      name: 'min_word_length'
    },
    mltFields: {
      type: 'list',
      name: 'mlt_fields'
    },
    percentTermsToMatch: {
      type: 'number',
      name: 'percent_terms_to_match'
    },
    routing: {
      type: 'string'
    },
    searchFrom: {
      type: 'number',
      name: 'search_from'
    },
    searchIndices: {
      type: 'list',
      name: 'search_indices'
    },
    searchQueryHint: {
      type: 'string',
      name: 'search_query_hint'
    },
    searchScroll: {
      type: 'string',
      name: 'search_scroll'
    },
    searchSize: {
      type: 'number',
      name: 'search_size'
    },
    searchSource: {
      type: 'string',
      name: 'search_source'
    },
    searchType: {
      type: 'string',
      name: 'search_type'
    },
    searchTypes: {
      type: 'list',
      name: 'search_types'
    },
    stopWords: {
      type: 'list',
      name: 'stop_words'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>/_mlt',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [mpercolate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-percolate.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.index - The index of the document being count percolated to use as default
 * @param {String} params.type - The type of the document being percolated to use as default.
 */
api.mpercolate = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_mpercolate',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_mpercolate',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_mpercolate'
    }
  ],
  needBody: true,
  bulkBody: true,
  method: 'POST'
});

/**
 * Perform a [msearch](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-multi-search.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.searchType - Search operation type
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to use as default
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to use as default
 */
api.msearch = ca({
  params: {
    searchType: {
      type: 'enum',
      options: [
        'query_then_fetch',
        'query_and_fetch',
        'dfs_query_then_fetch',
        'dfs_query_and_fetch',
        'count',
        'scan'
      ],
      name: 'search_type'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_msearch',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_msearch',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_msearch'
    }
  ],
  needBody: true,
  bulkBody: true,
  method: 'POST'
});

/**
 * Perform a [mtermvectors](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-multi-termvectors.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.ids - A comma-separated list of documents ids. You must define ids as parameter or set "ids" or "docs" in the request body
 * @param {Boolean} params.termStatistics - Specifies if total term frequency and document frequency should be returned. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {Boolean} [params.fieldStatistics=true] - Specifies if document count, sum of document frequencies and sum of total term frequencies should be returned. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {Boolean} [params.offsets=true] - Specifies if term offsets should be returned. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {Boolean} [params.positions=true] - Specifies if term positions should be returned. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {Boolean} [params.payloads=true] - Specifies if term payloads should be returned. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random) .Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {String} params.routing - Specific routing value. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {String} params.parent - Parent id of documents. Applies to all returned documents unless otherwise specified in body "params" or "docs".
 * @param {String} params.index - The index in which the document resides.
 * @param {String} params.type - The type of the document.
 * @param {String} params.id - The id of the document.
 */
api.mtermvectors = ca({
  params: {
    ids: {
      type: 'list',
      required: false
    },
    termStatistics: {
      type: 'boolean',
      'default': false,
      required: false,
      name: 'term_statistics'
    },
    fieldStatistics: {
      type: 'boolean',
      'default': true,
      required: false,
      name: 'field_statistics'
    },
    fields: {
      type: 'list',
      required: false
    },
    offsets: {
      type: 'boolean',
      'default': true,
      required: false
    },
    positions: {
      type: 'boolean',
      'default': true,
      required: false
    },
    payloads: {
      type: 'boolean',
      'default': true,
      required: false
    },
    preference: {
      type: 'string',
      required: false
    },
    routing: {
      type: 'string',
      required: false
    },
    parent: {
      type: 'string',
      required: false
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_mtermvectors',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_mtermvectors',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_mtermvectors'
    }
  ],
  method: 'POST'
});

api.nodes = namespace();

/**
 * Perform a [nodes.hotThreads](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-nodes-hot-threads.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.interval - The interval for the second sampling of threads
 * @param {Number} params.snapshots - Number of samples of thread stacktrace (default: 10)
 * @param {Number} params.threads - Specify the number of threads to provide information for (default: 3)
 * @param {String} params.type - The type to sample (default: cpu)
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to limit the returned information; use `_local` to return information from the node you're connecting to, leave empty to get information from all nodes
 */
api.nodes.prototype.hotThreads = ca({
  params: {
    interval: {
      type: 'time'
    },
    snapshots: {
      type: 'number'
    },
    threads: {
      type: 'number'
    },
    type: {
      type: 'enum',
      options: [
        'cpu',
        'wait',
        'block'
      ]
    }
  },
  urls: [
    {
      fmt: '/_nodes/<%=nodeId%>/hotthreads',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_nodes/hotthreads'
    }
  ]
});

/**
 * Perform a [nodes.info](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-nodes-info.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.flatSettings - Return settings in flat format (default: false)
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to limit the returned information; use `_local` to return information from the node you're connecting to, leave empty to get information from all nodes
 * @param {String, String[], Boolean} params.metric - A comma-separated list of metrics you wish returned. Leave empty to return all.
 */
api.nodes.prototype.info = ca({
  params: {
    flatSettings: {
      type: 'boolean',
      name: 'flat_settings'
    },
    human: {
      type: 'boolean',
      'default': false
    }
  },
  urls: [
    {
      fmt: '/_nodes/<%=nodeId%>/<%=metric%>',
      req: {
        nodeId: {
          type: 'list'
        },
        metric: {
          type: 'list',
          options: [
            'settings',
            'os',
            'process',
            'jvm',
            'thread_pool',
            'network',
            'transport',
            'http',
            'plugin'
          ]
        }
      }
    },
    {
      fmt: '/_nodes/<%=nodeId%>',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_nodes/<%=metric%>',
      req: {
        metric: {
          type: 'list',
          options: [
            'settings',
            'os',
            'process',
            'jvm',
            'thread_pool',
            'network',
            'transport',
            'http',
            'plugin'
          ]
        }
      }
    },
    {
      fmt: '/_nodes'
    }
  ]
});

/**
 * Perform a [nodes.shutdown](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-nodes-shutdown.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.delay - Set the delay for the operation (default: 1s)
 * @param {Boolean} params.exit - Exit the JVM as well (default: true)
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to perform the operation on; use `_local` to perform the operation on the node you're connected to, leave empty to perform the operation on all nodes
 */
api.nodes.prototype.shutdown = ca({
  params: {
    delay: {
      type: 'time'
    },
    exit: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/_cluster/nodes/<%=nodeId%>/_shutdown',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_shutdown'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [nodes.stats](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/cluster-nodes-stats.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.completionFields - A comma-separated list of fields for `fielddata` and `suggest` index metric (supports wildcards)
 * @param {String, String[], Boolean} params.fielddataFields - A comma-separated list of fields for `fielddata` index metric (supports wildcards)
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields for `fielddata` and `completion` index metric (supports wildcards)
 * @param {Boolean} params.groups - A comma-separated list of search groups for `search` index metric
 * @param {Boolean} params.human - Whether to return time and byte values in human-readable format.
 * @param {String} [params.level=node] - Return indices stats aggregated at node, index or shard level
 * @param {String, String[], Boolean} params.types - A comma-separated list of document types for the `indexing` index metric
 * @param {String, String[], Boolean} params.metric - Limit the information returned to the specified metrics
 * @param {String, String[], Boolean} params.indexMetric - Limit the information returned for `indices` metric to the specific index metrics. Isn't used if `indices` (or `all`) metric isn't specified.
 * @param {String, String[], Boolean} params.nodeId - A comma-separated list of node IDs or names to limit the returned information; use `_local` to return information from the node you're connecting to, leave empty to get information from all nodes
 */
api.nodes.prototype.stats = ca({
  params: {
    completionFields: {
      type: 'list',
      name: 'completion_fields'
    },
    fielddataFields: {
      type: 'list',
      name: 'fielddata_fields'
    },
    fields: {
      type: 'list'
    },
    groups: {
      type: 'boolean'
    },
    human: {
      type: 'boolean',
      'default': false
    },
    level: {
      type: 'enum',
      'default': 'node',
      options: [
        'node',
        'indices',
        'shards'
      ]
    },
    types: {
      type: 'list'
    }
  },
  urls: [
    {
      fmt: '/_nodes/<%=nodeId%>/stats/<%=metric%>/<%=indexMetric%>',
      req: {
        nodeId: {
          type: 'list'
        },
        metric: {
          type: 'list',
          options: [
            '_all',
            'breaker',
            'fs',
            'http',
            'indices',
            'jvm',
            'network',
            'os',
            'process',
            'thread_pool',
            'transport'
          ]
        },
        indexMetric: {
          type: 'list',
          options: [
            '_all',
            'completion',
            'docs',
            'fielddata',
            'filter_cache',
            'flush',
            'get',
            'id_cache',
            'indexing',
            'merge',
            'percolate',
            'refresh',
            'search',
            'segments',
            'store',
            'warmer'
          ]
        }
      }
    },
    {
      fmt: '/_nodes/<%=nodeId%>/stats/<%=metric%>',
      req: {
        nodeId: {
          type: 'list'
        },
        metric: {
          type: 'list',
          options: [
            '_all',
            'breaker',
            'fs',
            'http',
            'indices',
            'jvm',
            'network',
            'os',
            'process',
            'thread_pool',
            'transport'
          ]
        }
      }
    },
    {
      fmt: '/_nodes/stats/<%=metric%>/<%=indexMetric%>',
      req: {
        metric: {
          type: 'list',
          options: [
            '_all',
            'breaker',
            'fs',
            'http',
            'indices',
            'jvm',
            'network',
            'os',
            'process',
            'thread_pool',
            'transport'
          ]
        },
        indexMetric: {
          type: 'list',
          options: [
            '_all',
            'completion',
            'docs',
            'fielddata',
            'filter_cache',
            'flush',
            'get',
            'id_cache',
            'indexing',
            'merge',
            'percolate',
            'refresh',
            'search',
            'segments',
            'store',
            'warmer'
          ]
        }
      }
    },
    {
      fmt: '/_nodes/<%=nodeId%>/stats',
      req: {
        nodeId: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_nodes/stats/<%=metric%>',
      req: {
        metric: {
          type: 'list',
          options: [
            '_all',
            'breaker',
            'fs',
            'http',
            'indices',
            'jvm',
            'network',
            'os',
            'process',
            'thread_pool',
            'transport'
          ]
        }
      }
    },
    {
      fmt: '/_nodes/stats'
    }
  ]
});

/**
 * Perform a [percolate](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-percolate.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String, String[], Boolean} params.routing - A comma-separated list of specific routing values
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.percolateIndex - The index to percolate the document into. Defaults to index.
 * @param {String} params.percolateType - The type to percolate document into. Defaults to type.
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.index - The index of the document being percolated.
 * @param {String} params.type - The type of the document being percolated.
 * @param {String} params.id - Substitute the document in the request body with a document that is known by the specified id. On top of the id, the index and type parameter will be used to retrieve the document from within the cluster.
 */
api.percolate = ca({
  params: {
    routing: {
      type: 'list'
    },
    preference: {
      type: 'string'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    percolateIndex: {
      type: 'string',
      name: 'percolate_index'
    },
    percolateType: {
      type: 'string',
      name: 'percolate_type'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/<%=id%>/_percolate',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        id: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/<%=type%>/_percolate',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    }
  ],
  method: 'POST'
});

/**
 * Perform a [ping](http://www.elasticsearch.org/guide/) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 */
api.ping = ca({
  url: {
    fmt: '/'
  },
  requestTimeout: 3000,
  method: 'HEAD'
});

/**
 * Perform a [scroll](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-request-scroll.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Duration} params.scroll - Specify how long a consistent view of the index should be maintained for scrolled search
 * @param {String} params.scrollId - The scroll ID
 */
api.scroll = ca({
  params: {
    scroll: {
      type: 'duration'
    },
    scrollId: {
      type: 'string',
      name: 'scroll_id'
    }
  },
  urls: [
    {
      fmt: '/_search/scroll/<%=scrollId%>',
      req: {
        scrollId: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_search/scroll'
    }
  ],
  paramAsBody: 'scrollId',
  method: 'POST'
});

/**
 * Perform a [search](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-search.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.analyzer - The analyzer to use for the query string
 * @param {Boolean} params.analyzeWildcard - Specify whether wildcard and prefix queries should be analyzed (default: false)
 * @param {String} [params.defaultOperator=OR] - The default operator for query string query (AND or OR)
 * @param {String} params.df - The field to use as default where no field prefix is given in the query string
 * @param {Boolean} params.explain - Specify whether to return detailed information about score computation as part of a hit
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return as part of a hit
 * @param {Number} params.from - Starting offset (default: 0)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String, String[], Boolean} params.indicesBoost - Comma-separated list of index boosts
 * @param {Boolean} params.lenient - Specify whether format-based query failures (such as providing text to a numeric field) should be ignored
 * @param {Boolean} params.lowercaseExpandedTerms - Specify whether query terms should be lowercased
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {String} params.q - Query in the Lucene query string syntax
 * @param {String, String[], Boolean} params.routing - A comma-separated list of specific routing values
 * @param {Duration} params.scroll - Specify how long a consistent view of the index should be maintained for scrolled search
 * @param {String} params.searchType - Search operation type
 * @param {Number} params.size - Number of hits to return (default: 10)
 * @param {String, String[], Boolean} params.sort - A comma-separated list of <field>:<direction> pairs
 * @param {String} params.source - The URL-encoded request definition using the Query DSL (instead of using request body)
 * @param {String, String[], Boolean} params._source - True or false to return the _source field or not, or a list of fields to return
 * @param {String, String[], Boolean} params._sourceExclude - A list of fields to exclude from the returned _source field
 * @param {String, String[], Boolean} params._sourceInclude - A list of fields to extract and return from the _source field
 * @param {String, String[], Boolean} params.stats - Specific 'tag' of the request for logging and statistical purposes
 * @param {String} params.suggestField - Specify which field to use for suggestions
 * @param {String} [params.suggestMode=missing] - Specify suggest mode
 * @param {Number} params.suggestSize - How many suggestions to return in response
 * @param {Text} params.suggestText - The source text for which the suggestions should be returned
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Boolean} params.trackScores - Whether to calculate and return scores even if they are not used for sorting
 * @param {Boolean} params.version - Specify whether to return document version as part of a hit
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to search; use `_all` or empty string to perform the operation on all indices
 * @param {String, String[], Boolean} params.type - A comma-separated list of document types to search; leave empty to perform the operation on all types
 */
api.search = ca({
  params: {
    analyzer: {
      type: 'string'
    },
    analyzeWildcard: {
      type: 'boolean',
      name: 'analyze_wildcard'
    },
    defaultOperator: {
      type: 'enum',
      'default': 'OR',
      options: [
        'AND',
        'OR'
      ],
      name: 'default_operator'
    },
    df: {
      type: 'string'
    },
    explain: {
      type: 'boolean'
    },
    fields: {
      type: 'list'
    },
    from: {
      type: 'number'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    indicesBoost: {
      type: 'list',
      name: 'indices_boost'
    },
    lenient: {
      type: 'boolean'
    },
    lowercaseExpandedTerms: {
      type: 'boolean',
      name: 'lowercase_expanded_terms'
    },
    preference: {
      type: 'string'
    },
    q: {
      type: 'string'
    },
    routing: {
      type: 'list'
    },
    scroll: {
      type: 'duration'
    },
    searchType: {
      type: 'enum',
      options: [
        'query_then_fetch',
        'query_and_fetch',
        'dfs_query_then_fetch',
        'dfs_query_and_fetch',
        'count',
        'scan'
      ],
      name: 'search_type'
    },
    size: {
      type: 'number'
    },
    sort: {
      type: 'list'
    },
    source: {
      type: 'string'
    },
    _source: {
      type: 'list'
    },
    _sourceExclude: {
      type: 'list',
      name: '_source_exclude'
    },
    _sourceInclude: {
      type: 'list',
      name: '_source_include'
    },
    stats: {
      type: 'list'
    },
    suggestField: {
      type: 'string',
      name: 'suggest_field'
    },
    suggestMode: {
      type: 'enum',
      'default': 'missing',
      options: [
        'missing',
        'popular',
        'always'
      ],
      name: 'suggest_mode'
    },
    suggestSize: {
      type: 'number',
      name: 'suggest_size'
    },
    suggestText: {
      type: 'text',
      name: 'suggest_text'
    },
    timeout: {
      type: 'time'
    },
    trackScores: {
      type: 'boolean',
      name: 'track_scores'
    },
    version: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_search',
      req: {
        index: {
          type: 'list'
        },
        type: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/<%=index%>/_search',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_search'
    }
  ],
  method: 'POST'
});

/**
 * Perform a [searchShards](http://www.elasticsearch.org/guide/en/elasticsearch/reference/master/search-shards.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {String} params.routing - Specific routing value
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.searchShards = ca({
  params: {
    preference: {
      type: 'string'
    },
    routing: {
      type: 'string'
    },
    local: {
      type: 'boolean'
    },
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/<%=type%>/_search_shards',
      req: {
        index: {
          type: 'string'
        },
        type: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/<%=index%>/_search_shards',
      req: {
        index: {
          type: 'string'
        }
      }
    },
    {
      fmt: '/_search_shards'
    }
  ],
  method: 'POST'
});

api.snapshot = namespace();

/**
 * Perform a [snapshot.create](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Boolean} params.waitForCompletion - Should this request wait until the operation has completed before returning
 * @param {String} params.repository - A repository name
 * @param {String} params.snapshot - A snapshot name
 */
api.snapshot.prototype.create = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    waitForCompletion: {
      type: 'boolean',
      'default': false,
      name: 'wait_for_completion'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>/<%=snapshot%>/_create',
    req: {
      repository: {
        type: 'string'
      },
      snapshot: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [snapshot.createRepository](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {String} params.repository - A repository name
 */
api.snapshot.prototype.createRepository = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    timeout: {
      type: 'time'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>',
    req: {
      repository: {
        type: 'string'
      }
    }
  },
  needBody: true,
  method: 'POST'
});

/**
 * Perform a [snapshot.delete](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String} params.repository - A repository name
 * @param {String} params.snapshot - A snapshot name
 */
api.snapshot.prototype['delete'] = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>/<%=snapshot%>',
    req: {
      repository: {
        type: 'string'
      },
      snapshot: {
        type: 'string'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [snapshot.deleteRepository](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {String, String[], Boolean} params.repository - A comma-separated list of repository names
 */
api.snapshot.prototype.deleteRepository = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    timeout: {
      type: 'time'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>',
    req: {
      repository: {
        type: 'list'
      }
    }
  },
  method: 'DELETE'
});

/**
 * Perform a [snapshot.get](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {String} params.repository - A repository name
 * @param {String, String[], Boolean} params.snapshot - A comma-separated list of snapshot names
 */
api.snapshot.prototype.get = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>/<%=snapshot%>',
    req: {
      repository: {
        type: 'string'
      },
      snapshot: {
        type: 'list'
      }
    }
  }
});

/**
 * Perform a [snapshot.getRepository](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Boolean} params.local - Return local information, do not retrieve the state from master node (default: false)
 * @param {String, String[], Boolean} params.repository - A comma-separated list of repository names
 */
api.snapshot.prototype.getRepository = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    local: {
      type: 'boolean'
    }
  },
  urls: [
    {
      fmt: '/_snapshot/<%=repository%>',
      req: {
        repository: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_snapshot'
    }
  ]
});

/**
 * Perform a [snapshot.restore](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/modules-snapshots.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Date, Number} params.masterTimeout - Explicit operation timeout for connection to master node
 * @param {Boolean} params.waitForCompletion - Should this request wait until the operation has completed before returning
 * @param {String} params.repository - A repository name
 * @param {String} params.snapshot - A snapshot name
 */
api.snapshot.prototype.restore = ca({
  params: {
    masterTimeout: {
      type: 'time',
      name: 'master_timeout'
    },
    waitForCompletion: {
      type: 'boolean',
      'default': false,
      name: 'wait_for_completion'
    }
  },
  url: {
    fmt: '/_snapshot/<%=repository%>/<%=snapshot%>/_restore',
    req: {
      repository: {
        type: 'string'
      },
      snapshot: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [suggest](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-search.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.ignoreUnavailable - Whether specified concrete indices should be ignored when unavailable (missing or closed)
 * @param {Boolean} params.allowNoIndices - Whether to ignore if a wildcard indices expression resolves into no concrete indices. (This includes `_all` string or when no indices have been specified)
 * @param {String} [params.expandWildcards=open] - Whether to expand wildcard expression to concrete indices that are open, closed or both.
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random)
 * @param {String} params.routing - Specific routing value
 * @param {String} params.source - The URL-encoded request definition (instead of using request body)
 * @param {String, String[], Boolean} params.index - A comma-separated list of index names to restrict the operation; use `_all` or empty string to perform the operation on all indices
 */
api.suggest = ca({
  params: {
    ignoreUnavailable: {
      type: 'boolean',
      name: 'ignore_unavailable'
    },
    allowNoIndices: {
      type: 'boolean',
      name: 'allow_no_indices'
    },
    expandWildcards: {
      type: 'enum',
      'default': 'open',
      options: [
        'open',
        'closed'
      ],
      name: 'expand_wildcards'
    },
    preference: {
      type: 'string'
    },
    routing: {
      type: 'string'
    },
    source: {
      type: 'string'
    }
  },
  urls: [
    {
      fmt: '/<%=index%>/_suggest',
      req: {
        index: {
          type: 'list'
        }
      }
    },
    {
      fmt: '/_suggest'
    }
  ],
  needBody: true,
  method: 'POST'
});

/**
 * Perform a [termvector](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-termvectors.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {Boolean} params.termStatistics - Specifies if total term frequency and document frequency should be returned.
 * @param {Boolean} [params.fieldStatistics=true] - Specifies if document count, sum of document frequencies and sum of total term frequencies should be returned.
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return.
 * @param {Boolean} [params.offsets=true] - Specifies if term offsets should be returned.
 * @param {Boolean} [params.positions=true] - Specifies if term positions should be returned.
 * @param {Boolean} [params.payloads=true] - Specifies if term payloads should be returned.
 * @param {String} params.preference - Specify the node or shard the operation should be performed on (default: random).
 * @param {String} params.routing - Specific routing value.
 * @param {String} params.parent - Parent id of documents.
 * @param {String} params.index - The index in which the document resides.
 * @param {String} params.type - The type of the document.
 * @param {String} params.id - The id of the document.
 */
api.termvector = ca({
  params: {
    termStatistics: {
      type: 'boolean',
      'default': false,
      required: false,
      name: 'term_statistics'
    },
    fieldStatistics: {
      type: 'boolean',
      'default': true,
      required: false,
      name: 'field_statistics'
    },
    fields: {
      type: 'list',
      required: false
    },
    offsets: {
      type: 'boolean',
      'default': true,
      required: false
    },
    positions: {
      type: 'boolean',
      'default': true,
      required: false
    },
    payloads: {
      type: 'boolean',
      'default': true,
      required: false
    },
    preference: {
      type: 'string',
      required: false
    },
    routing: {
      type: 'string',
      required: false
    },
    parent: {
      type: 'string',
      required: false
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>/_termvector',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [update](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-update.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.consistency - Explicit write consistency setting for the operation
 * @param {String, String[], Boolean} params.fields - A comma-separated list of fields to return in the response
 * @param {String} params.lang - The script language (default: mvel)
 * @param {String} params.parent - ID of the parent document
 * @param {Boolean} params.refresh - Refresh the index after performing the operation
 * @param {String} [params.replication=sync] - Specific replication type
 * @param {Number} params.retryOnConflict - Specify how many times should the operation be retried when a conflict occurs (default: 0)
 * @param {String} params.routing - Specific routing value
 * @param {Anything} params.script - The URL-encoded script definition (instead of using request body)
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.timestamp - Explicit timestamp for the document
 * @param {Duration} params.ttl - Expiration time for the document
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - Document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.update = ca({
  params: {
    consistency: {
      type: 'enum',
      options: [
        'one',
        'quorum',
        'all'
      ]
    },
    fields: {
      type: 'list'
    },
    lang: {
      type: 'string'
    },
    parent: {
      type: 'string'
    },
    refresh: {
      type: 'boolean'
    },
    replication: {
      type: 'enum',
      'default': 'sync',
      options: [
        'sync',
        'async'
      ]
    },
    retryOnConflict: {
      type: 'number',
      name: 'retry_on_conflict'
    },
    routing: {
      type: 'string'
    },
    script: {},
    timeout: {
      type: 'time'
    },
    timestamp: {
      type: 'time'
    },
    ttl: {
      type: 'duration'
    },
    version: {
      type: 'number'
    },
    versionType: {
      type: 'enum',
      options: [
        'internal',
        'external'
      ],
      name: 'version_type'
    }
  },
  url: {
    fmt: '/<%=index%>/<%=type%>/<%=id%>/_update',
    req: {
      index: {
        type: 'string'
      },
      type: {
        type: 'string'
      },
      id: {
        type: 'string'
      }
    }
  },
  method: 'POST'
});

/**
 * Perform a [create](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-index_.html) request
 *
 * @param {Object} params - An object with parameters used to carry out this action
 * @param {String} params.consistency - Explicit write consistency setting for the operation
 * @param {String} params.parent - ID of the parent document
 * @param {Boolean} params.refresh - Refresh the index after performing the operation
 * @param {String} [params.replication=sync] - Specific replication type
 * @param {String} params.routing - Specific routing value
 * @param {Date, Number} params.timeout - Explicit operation timeout
 * @param {Date, Number} params.timestamp - Explicit timestamp for the document
 * @param {Duration} params.ttl - Expiration time for the document
 * @param {Number} params.version - Explicit version number for concurrency control
 * @param {String} params.versionType - Specific version type
 * @param {String} params.id - Document ID
 * @param {String} params.index - The name of the index
 * @param {String} params.type - The type of the document
 */
api.create = ca.proxy(api.index, {
  transform: function (params) {
    params.op_type = 'create';
  }
});