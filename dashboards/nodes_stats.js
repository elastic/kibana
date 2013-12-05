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
  'interval': 'day'
};

dashboard.refresh="5s";

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
  marker_query = "(" + _.pluck(queries,"query").join(") OR (") + ")";
} else {
  // No queries passed? Initialize a single query to match everything
  queries = {
    0: {
      query: '*',
      id: 0
    }
  };
}

var annotate_config;

if (marker_query) {
  annotate_config = {
    "enable": true,
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
  legend: true,
  resolution: 20,
  annotate: annotate_config
};


var rows = [
  {
    "title": "Server",
    "panels": [
      {
        "value_field": "os.cpu.user",
        "title": "CPU (user)",
        "grid": {
          "max": 100,
          "min": 0
        }

      },
      {
        "value_field": "os.mem.used_percent",
        "title": "Memory usage (%)",
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
    "title": "Server 2",
    "panels": [
      {
        "time_field": "@timestamp",
        "value_field": "os.swap.used_in_bytes",
        "title": "Used Swap",
        "y_as_bytes": true
      }
    ]
  },
  {
    "title": "JVM Memory",
    "panels": [
      {
        "time_field": "@timestamp",
        "value_field": "jvm.mem.heap_used_in_bytes",
        "title": "Heap",
        "y_as_bytes": true
      },
      {
        "value_field": "jvm.gc.collectors.ParNew.collection_time_in_millis",
        "title": "GC Young Gen duration (time %)",
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
        "value_field": "jvm.gc.collectors.ParNew.collection_count",
        "title": "GC counts",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ]
  },
  {
    "title": "JVM Memory 2",
    "panels": [
      {
        "value_field": "jvm.gc.collectors.ConcurrentMarkSweep.collection_time_in_millis",
        "derivative": true,
        "mode": "min",
        "title": "GC Old Gen duration (time %)",
        "scaleSeconds": true,
        "scale": 0.001 * 100,
        "grid": {
          "max": 100,
          "min": 0
        }
      },
      {
        "value_field": "jvm.gc.collectors.ConcurrentMarkSweep.collection_count",
        "derivative": true,
        "scaleSeconds": true,
        "mode": "min",
        "title": "GC Old Gen count"
      }
    ]
  },
  {
    "title": "Caches",
    "panels": [
      {
        "value_field": "indices.fielddata.memory_size_in_bytes",
        "title": "Field Data",
        "y_as_bytes": true
      },
      {
        "value_field": "indices.filter_cache.memory_size_in_bytes",
        "title": "Filter cache",
        "y_as_bytes": true
      },
      {
        "value_field": "indices.id_cache.memory_size_in_bytes",
        "title": "Id cache",
        "y_as_bytes": true
      }
    ]
  },
  {
    "title": "Caches 2",
    "panels": [
      {
        "value_field": "indices.completion.size_in_bytes",
        "title": "Completion size",
        "y_as_bytes": true
      }
    ]
  },
  {
    "title": "Disk",
    "panels": [
      {
        "value_field": "fs.data.disk_read_size_in_bytes",
        "title": "Disk reads per sec.",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "y_as_bytes": true

      },
      {
        "value_field": "fs.data.disk_write_size_in_bytes",
        "title": "Disk writes per sec.",
        "derivative": true,
        "y_as_bytes": true,
        "mode": "min",
        "scaleSeconds": true
      },
      {
        "value_field": "fs.data.available_in_bytes",
        "title": "Disk Free space",
        "mode": "min",
        "y_as_bytes": true
      }
    ],
    "notice": false
  },
  {
    "title": "Network",
    "panels": [
      {
        "value_field": "http.current_open",
        "title": "HTTP currently open"
      },
      {
        "value_field": "http.total_opened",
        "title": "HTTP opened",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ]
  },
  {
    "title": "Indexing",
    "panels": [
      {
        "value_field": "indices.indexing.index_total",
        "derivative": true,
        "scaleSeconds": true,
        "title": "Indexing requests"
      },
      {
        "value_field": "indices.merges.current_size_in_bytes",
        "title": "Merges size",
        "y_as_bytes": true
      },
      {
        "value_field": "indices.refresh.total_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Avg refresh time"
      }
    ]
  },
  {
    "title": "Indexing 2",
    "panels": [
      {
        "value_field": "indices.flush.total",
        "derivative": true,
        "mode": "min",
        "title": "Flush count"
      }
    ]
  },
  {
    "title": "Search & Get",
    "panels": [
      {
        "value_field": "indices.search.query_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Search requests"
      },
      {
        "value_field": "indices.get.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Get requests"
      }
    ]
  },
  {
    "title": "Data",
    "panels": [
      {
        "value_field": "indices.docs.count",
        "title": "Documents"
      },
      {
        "value_field": "indices.store.size_in_bytes",
        "title": "Size",
        "y_as_bytes": true
      }
    ]
  },
  {
    "title": "Segments",
    "panels": [
      {
        "value_field": "indices.segments.count",
        "title": "Segment no."
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
        "value_field": "jvm.threads.count",
        "title": "Threads"
      },
      {
        "value_field": "process.open_file_descriptors",
        "title": "File descriptors"
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
    }
  });
  return r;
});

if (!showedSomething && dashboard.rows.length > 0) {
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

// Now return the object and we're good!
return dashboard;
