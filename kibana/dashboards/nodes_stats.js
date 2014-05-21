/* global _ */

/*
 * Node statistics scripted dashboard
 * This script generates a dashboard object that Kibana can load.
 *
 * Parameters (all optional)
 * nodes :: By default, a comma seperated list of queries to run. Default: *
 * show :: The names of the rows to expand
 * from :: Search this amount of time back, eg 15m, 1h, 2d. Default: 1d
 *
 */

'use strict';

// Setup some variables
var dashboard, queries, _d_timespan, marker_query;

// All url parameters are available via the ARGS object
var ARGS;

// Set a default timespan if one isn't specified
_d_timespan = '1d';

// Intialize a skeleton with nothing but a rows array and service object
dashboard = {
  rows: [],
  services: {}
};

// Set a title
dashboard.title = 'Marvel - Node Statistics';

// And the index options
dashboard.failover = false;
dashboard.index = {
  'default': 'ADD_A_TIME_FILTER',
  'pattern': '[.marvel-]YYYY.MM.DD',
  'interval': 'day',
  'warm_fields': false
};

dashboard.refresh = "1m";

dashboard.nav = [
  {
    type:'timepicker'
  },
  {
    type: "marvel.navigation",
    source: "url",
    url: "../common/marvelLinks.json"
  }
];


// In this dashboard we let users pass nodes as comma seperated list to the query parameter.
// If nodes are defined, split into a list of query objects, otherwise, show all
// NOTE: ids must be integers, hence the parseInt()s
if (!_.isUndefined(ARGS.queries)) {
  queries = _.object(_.map(JSON.parse(ARGS.queries), function (v, k) {
    return [k, {
      query: v.q,
      alias: v.a || v.q,
      pin: true,
      id: parseInt(k, 10)
    }];
  }));
  marker_query = "(" + _.pluck(queries, "query").join(") OR (") + ")";
} else {
  // No queries passed
  queries = {};
}

var annotate_config;

if (marker_query) {
  annotate_config = {
    "enable": false,
    "query": "_type:shard_event AND (" + marker_query + ")",
    "size": 100,
    "field": "message",
    "sort": [
      "@timestamp",
      "desc"
    ]
  };
} else {
  annotate_config = {};
}

var show = (ARGS.show || "").split(',');

// Now populate the query service with our objects
dashboard.services.query = {
  list: queries,
  ids: _.map(_.keys(queries), function (v) {
    return parseInt(v, 10);
  })
};


// Lets also add a default time filter, the value of which can be specified by the user
dashboard.services.filter = {
  list: {
    0: {
      from: ARGS.from || "now-" + _d_timespan,
      to: ARGS.to || "now",
      field: "@timestamp",
      type: "time",
      active: true,
      id: 0
    },
    1: {
      type: "querystring",
      mandate: "must",
      active: true,
      alias: "node stats",
      query: "_type:node_stats",
      id: 1
    }
  },
  ids: [0, 1]
};


var row_defaults = {
  height: "150px",
  collapse: true,
  collapsable: true
};

var panel_defaults_by_type = {};

panel_defaults_by_type["histogram"] = {
  span: 4,
  time_field: '@timestamp',
  bars: false,
  lines: true,
  stack: false,
  linewidth: 2,
  legend_counts: false,
  mode: 'max',
  zoomlinks: false,
  options: false,
  legend: false,
  resolution: 22,
  annotate: annotate_config,
  y_format: "short"
};

function clusterViewFilter (query) {
  if (query.length !==0) {
    var filter = _.map(query, function (row) {
      return row.query.replace(/node.ip_port.raw:"([^"]+)"/, '$1'); 
    });
    return '^('+filter.join('|')+')$';
  }
  return '';
}


function threadPoolRow(name) {
  var field_prefix = "thread_pool." + name.toLowerCase() + ".",
    name_prefix = name + " Thread Pool ";
  return {
    "title": "Thread Pools - " + name,
    "panels": [
      {
        "value_field": field_prefix + "threads",
        "title": name_prefix + "Thread Count"
      },
      {
        "value_field": field_prefix + "rejected",
        "title": name_prefix + "Rejected"
      },
      {
        "value_field": field_prefix + "completed",
        "title": name_prefix + "Ops Per Sec",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "short"
      }
    ]
  };
}

var rows = [
  {
    "title": "Essentials",
    "panels": [
      {
        "value_field": "os.cpu.usage",
        "title": "OS CPU",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "jvm.mem.heap_used_percent",
        "title": "JVM Heap usage (%)",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "os.load_average.1m",
        "title": "Load (1m)"
      }
    ]
  },
  {
    "title": "OS",
    "panels": [
      {
        "value_field": "os.cpu.usage",
        "title": "OS CPU",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "os.mem.used_percent",
        "title": "OS Memory usage (%)",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "os.load_average.1m",
        "title": "OS Load (1m)"
      }
    ]
  },
  {
    "title": "OS Extended",
    "panels": [
      {
        "value_field": "os.cpu.sys",
        "title": "OS CPU Sys",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "os.cpu.stolen",
        "title": "OS CPU Steal",
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "time_field": "@timestamp",
        "value_field": "os.swap.used_in_bytes",
        "title": "OS Swap Used",
        "y_format": "bytes"
      }
    ]
  },
  {
    "title": "JVM Memory",
    "panels": [
      {
        "time_field": "@timestamp",
        "value_field": "jvm.mem.heap_used_in_bytes",
        "title": "JVM Heap Used",
        "y_format": "bytes"
      },
      {
        "value_field": "jvm.gc.collectors.young.collection_time_in_millis",
        "title": "JVM GC Young Duration (time %)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001 * 100,
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "jvm.gc.collectors.old.collection_time_in_millis",
        "title": "JVM GC Old Duration (time %)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001 * 100,
        "grid": {
          "max": 100,
          "min": 0
        }
      }
    ]
  },
  {
    "title": "JVM GC Young",
    "panels": [
      {
        "value_field": "jvm.gc.collectors.young.collection_time_in_millis",
        "title": "GC Young Duration (time %)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001 * 100,
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "jvm.gc.collectors.young.collection_count",
        "title": "JVM GC Young Counts",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": false
      }
    ]
  },
  {
    "title": "JVM GC Old",
    "panels": [
      {
        "value_field": "jvm.gc.collectors.old.collection_time_in_millis",
        "title": "JVM GC Old Duration (time %)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001 * 100,
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "jvm.gc.collectors.old.collection_count",
        "title": "JVM GC Old Counts",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": false
      }
    ]
  },
  {
    "title": "Indices Search Requests Query",
    "panels": [
      {
        "value_field": "indices.search.query_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Search Shard Query Rate"
      },
      {
        "value_field": "indices.search.query_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Indices Total Shard Search Query Time"
      }
    ]
  },
  {
    "title": "Indices Search Requests Fetch",
    "panels": [
      {
        "value_field": "indices.search.fetch_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Search Shard Fetch Rate"
      },
      {
        "value_field": "indices.search.fetch_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Indices Total Search Shard Fetch Time"
      }
    ]
  },
  {
    "title": "Indices Indexing Requests",
    "panels": [
      {
        "value_field": "indices.indexing.index_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Indexing Rate"
      },
      {
        "value_field": "indices.indexing.index_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Indices Total Indexing Time"
      },
      {
        "value_field": "indices.indexing.delete_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Delete Rate"
      }
    ]
  },
  {
    "title": "Indices Get Requests",
    "panels": [
      {
        "value_field": "indices.get.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Get Requests Rate"
      },
      {
        "value_field": "indices.get.time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Indices Total Get Time"
      }
    ]
  },
  {
    "title": "Indices Percolate Requests",
    "panels": [
      {
        "value_field": "indices.percolate.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Percolate Requests Rate"
      },
      {
        "value_field": "indices.percolate.time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Indices Total Percolate Time"
      },
      {
        "value_field": "indices.percolate.queries",
        "title": "Indices Percolate Queries"
      }
    ]
  },
  {
    "title": "Indices Store",
    "panels": [
      {
        "value_field": "indices.docs.count",
        "title": "Documents"
      },
      {
        "value_field": "indices.store.size_in_bytes",
        "title": "Size",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.docs.deleted",
        "title": "Deleted Documents"
      }
    ]
  },
  {
    "title": "Indices Memory",
    "panels": [
      {
        "value_field": "indices.fielddata.memory_size_in_bytes",
        "title": "Indices Field Data",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.filter_cache.memory_size_in_bytes",
        "title": "Indices Filter cache",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.segments.memory_in_bytes",
        "title": "Indices Lucene Memory",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.fielddata.evictions",
        "title": "Indices Field Data Eviction Rate",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ]
  },
  {
    "title": "Indices Memory Extended",
    "panels": [
      {
        "value_field": "indices.id_cache.memory_size_in_bytes",
        "title": "Indices Id Cache",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.percolate.memory_size_in_bytes",
        "title": "Indices Percolation size",
        "y_format": "bytes"
      },
      {
        "value_field": "indices.completion.size_in_bytes",
        "title": "Indices Completion size",
        "y_format": "bytes"
      }
    ]
  },
  {
    "title": "Indices Allocated",
    "panels": [
      {
        "span": 12,
        "editable": true,
        "type": "marvel.shard_allocation",
        "loadingEditor": false,
        "show_hidden": true,
        "showPlayer": false,
        "view": "nodes",
        "title": "Indices Allocated",
        "filter": clusterViewFilter(dashboard.services.query.list),
        "embeded": true 
      }
    ]
  },
  {
    "title": "Indices Management",
    "panels": [
      {
        "value_field": "indices.merges.current_size_in_bytes",
        "mode": "max",
        "y_format": "bytes",
        "title": "Indices Current Merges"
      },
      {
        "value_field": "indices.refresh.total_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scale": 0.001,
        "scaleSeconds": true,
        "title": "Indices Total Refresh Time"
      },
      {
        "value_field": "indices.flush.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indices Flush count"
      }
    ]
  },
  {
    "title": "Indices Management Extended",
    "panels": [
      {
        "value_field": "indices.search.open_contexts",
        "mode": "max",
        "title": "Indices Open Search Contexts"
      },
      {
        "value_field": "indices.warmer.total_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scale": 0.001,
        "scaleSeconds": true,
        "title": "Indices Total Warmer Time"
      },
      {
        "value_field": "indices.segments.count",
        "title": "Indices Segment Count"
      }
    ]
  },
  {
    "title": "Circuit Breakers",
    "panels": [
      {
        "value_field": "fielddata_breaker.estimated_size_in_bytes",
        "mode": "max",
        "title": "Field Data Circuit Breaker Estimated Size",
        "y_format": "bytes"
      },
      {
        "value_field": "fielddata_breaker.tripped",
        "mode": "max",
        "title": "Field Data Circuit Breaker Trip Count"
      }      
    ]
  },
  {
    "title": "Process",
    "panels": [
      {
        "value_field": "process.cpu.percent",
        "title": "Process CPU"
      },
      {
        "value_field": "process.open_file_descriptors",
        "title": "Process Open File descriptors"
      },
      {
        "value_field": "jvm.threads.count",
        "title": "Process Thread Count"
      }
    ]
  },
  threadPoolRow("Search"),
  threadPoolRow("Index"),
  threadPoolRow("Bulk"),
  threadPoolRow("Get"),
  threadPoolRow("Suggest"),
  threadPoolRow("Percolate"),
  threadPoolRow("Refresh"),
  threadPoolRow("Optimize"),
  {
    "title": "Disk",
    "panels": [
      {
        "value_field": "fs.total.disk_read_size_in_bytes",
        "title": "Disk read rate (bytes)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "bytes"

      },
      {
        "value_field": "fs.total.disk_write_size_in_bytes",
        "title": "Disk write per (bytes)",
        "derivative": true,
        "y_format": "bytes",
        "mode": "min",
        "scaleSeconds": true
      },
      {
        "value_field": "fs.total.available_in_bytes",
        "title": "Disk Free space",
        "mode": "min",
        "y_format": "bytes"
      }
    ],
    "notice": false
  },
  {
    "title": "Disk IOPS",
    "panels": [
      {
        "value_field": "fs.total.disk_io_op",
        "title": "Disk IOps",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "short"
      },
      {
        "value_field": "fs.total.disk_reads",
        "title": "Disk Read IOps",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "short"
      },
      {
        "value_field": "fs.total.disk_writes",
        "title": "Disk Write IOps",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "short"
      }
    ],
    "notice": false
  },
  {
    "title": "Network",
    "panels": [
      {
        "value_field": "http.total_opened",
        "title": "Network HTTP Connection Opened (per sec)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      },
      {
        "value_field": "transport.tx_size_in_bytes",
        "title": "Network Transport Bytes Sent (per sec)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "bytes"
      },
      {
        "value_field": "transport.tx_size_in_bytes",
        "title": "Network Transport Bytes Received (per sec)",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_format": "bytes"
      }
    ]
  }
];

var showedSomething;

dashboard.rows = _.map(rows, function (r) {
  _.defaults(r, row_defaults);
  _.each(r.panels, function (panel) {
    if (!panel.type) {
      panel.type = "histogram";
    }
    _.defaults(panel, panel_defaults_by_type[panel.type]);
    if (_.contains(show, panel.value_field)) {
      showedSomething = true;
      r.collapse = false;
      show = _.without(show, panel.value_field);
    }
  });
  return r;
});

// open the first row if nothing was opened and we have queries (o.w. it's meaningless)
if (!showedSomething && dashboard.rows.length > 0 && _.size(queries) > 0) {
  dashboard.rows[0].collapse = false;
}


dashboard.pulldowns = [
  {
    "type": "query",
    "collapse": false,
    "notice": false,
    "enable": true
  },
  {
    "type": "filtering",
    "collapse": true
  }
];

dashboard.loader = {
  "show_home": false,
  "save_gist": false,
  "save_elasticsearch": false,
  "save_local": false,
  "save_default": false,
  "save_temp": false,
  "save_temp_ttl_enable": true,
  "save_temp_ttl": "30d",
  "load_gist": false,
  "load_elasticsearch": false,
  "load_elasticsearch_size": 20,
  "load_local": false,
  "hide": true 
};

// Now return the object and we're good!
return dashboard;
