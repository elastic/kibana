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
} else {
  // No queries passed? Initialize a single query to match everything
  queries = {
    0: {
      query: '*',
      id: 0
    }
  };
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
  resolution: 20,
  y_format: "short"
};


var rows = [
  {
    "title": "Data",
    "panels": [
      {
        "value_field": "primaries.docs.count",
        "title": "Documents",
      },
      {
        "value_field": "total.store.size_in_bytes",
        "title": "Index size",
        "y_format": "bytes"
      },
      {
        "value_field": "primaries.docs.deleted",
        "title": "Deleted docs",
      }
    ],
    "notice": false
  },
  {
    "title": "Segments",
    "panels": [
      {
        "value_field": "total.segments.count",
        "title": "Avg Shard Segment Count*",
      }
    ],
    "notice": false
  },
  {
    "title": "Indexing",
    "panels": [
      {
        "value_field": "primaries.indexing.index_total",
        "title": "Indexing request rate",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      },
      {
        "value_field": "total.indexing.index_time_in_millis",
        "title": "Indexing time",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ]
  },
  {
    "title": "Indexing 2",
    "panels": [
      {
        "value_field": "total.refresh.total_time_in_millis",
        "title": "Avg Refresh time",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ]
  },
  {
    "title": "Search requests",
    "panels": [
      {
        "value_field": "total.search.query_total",
        "title": "Search requests",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      },
      {
        "value_field": "total.search.open_contexts",
        "title": "Open search contexts",
      }
    ]
  },
  {
    "title": "Get requests",
    "panels": [
      {
        "value_field": "total.get.total",
        "title": "Get requests",
        "derivative": true,
        "mode": "min",
        "scaleSeconds": true
      }
    ],
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
