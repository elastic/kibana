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
var dashboard, queries, _d_timespan;

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
dashboard.title = 'Marvel - Index Statistics';

// And the index options
dashboard.failover = false;
dashboard.index = {
  'default': 'ADD_A_TIME_FILTER',
  'pattern': '[.marvel-]YYYY.MM.DD',
  'interval': 'day',
  'warm_fields': false
};

dashboard.refresh="1m";

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
} else {
  // No queries passed
  queries = {};
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
      alias: "index stats",
      query: "_type:index_stats",
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
  mode: 'max',
  zoomlinks: false,
  legend_counts: false,
  options: false,
  legend: false,
  resolution: 22,
  y_format: "short"
};


var rows = [
  {
    "title": "Essentials",
    "panels": [
      {
        "value_field": "primaries.docs.count",
        "title": "Documents"
      },
      {
        "value_field": "primaries.indexing.index_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indexing Rate Primaries"
      },
      {
        "value_field": "total.search.query_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Search Shard Query Rate"
      }
    ]
  },
  {
    "title": "Search Requests Query",
    "panels": [
      {
        "value_field": "total.search.query_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Search Shard Query Rate"
      },
      {
        "value_field": "total.search.query_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Total Shard Search Query Time"
      }
    ]
  },
  {
    "title": "Search Requests Fetch",
    "panels": [
      {
        "value_field": "total.search.fetch_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Search Shard Fetch Rate"
      },
      {
        "value_field": "total.search.fetch_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Total Search Shard Fetch Time"
      }
    ]
  },
  {
    "title": "Indexing Requests",
    "panels": [
      {
        "value_field": "total.indexing.index_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Indexing Rate Total"
      },
      {
        "value_field": "total.indexing.index_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Total Indexing Time"
      },
      {
        "value_field": "total.indexing.delete_total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Delete Rate"
      }
    ]
  },
  {
    "title": "Get Requests",
    "panels": [
      {
        "value_field": "total.get.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Get Requests Rate"
      },
      {
        "value_field": "total.get.time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Total Get Time"
      }
    ]
  },
  {
    "title": "Percolate Requests",
    "panels": [
      {
        "value_field": "total.percolate.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Percolate Requests Rate"
      },
      {
        "value_field": "total.percolate.time_in_millis",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "scale": 0.001,
        "title": "Total Percolate Time"
      },
      {
        "value_field": "total.percolate.queries",
        "title": "Percolate Queries"
      }
    ]
  },
  {
    "title": "Store",
    "panels": [
      {
        "value_field": "primaries.docs.count",
        "title": "Documents"
      },
      {
        "value_field": "total.store.size_in_bytes",
        "title": "Size",
        "y_format": "bytes"
      },
      {
        "value_field": "primaries.docs.deleted",
        "title": "Deleted Documents"
      }
    ]
  },
  {
    "title": "Memory",
    "panels": [
      {
        "value_field": "total.fielddata.memory_size_in_bytes",
        "title": "Field Data",
        "y_format": "bytes"
      },
      {
        "value_field": "total.filter_cache.memory_size_in_bytes",
        "title": "Filter cache",
        "y_format": "bytes"
      },
      {
        "value_field": "total.segments.memory_in_bytes",
        "title": "Lucene Memory",
        "y_format": "bytes"
      }
    ]
  },
  {
    "title": "Memory Extended",
    "panels": [
      {
        "value_field": "total.id_cache.memory_size_in_bytes",
        "title": "Id Cache",
        "y_format": "bytes"
      },
      {
        "value_field": "total.percolate.memory_size_in_bytes",
        "title": "Percolation size",
        "y_format": "bytes"
      },
      {
        "value_field": "total.completion.size_in_bytes",
        "title": "Completion size",
        "y_format": "bytes"
      }
    ]
  },
  {
    "title": "Management",
    "panels": [
      {
        "value_field": "total.merges.current_size_in_bytes",
        "mode": "max",
        "y_format": "bytes",
        "title": "Current Merges"
      },
      {
        "value_field": "total.refresh.total_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scale": 0.001,
        "scaleSeconds": true,
        "title": "Total Refresh Time"
      },
      {
        "value_field": "total.flush.total",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true,
        "title": "Flush count"
      }
    ]
  },
  {
    "title": "Management Extended",
    "panels": [
      {
        "value_field": "total.search.open_contexts",
        "mode": "max",
        "title": "Open Search Contexts"
      },
      {
        "value_field": "total.warmer.total_time_in_millis",
        "derivative": true,
        "mode": "min",
        "scale": 0.001,
        "scaleSeconds": true,
        "title": "Total Warmer Time"
      },
      {
        "value_field": "total.segments.count",
        "title": "Segment Count"
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
