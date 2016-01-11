/* global _ */

/*
 * Complex scripted Logstash dashboard
 * This script generates a dashboard object that Kibana can load. It also takes a number of user
 * supplied URL parameters, none are required:
 *
 * index :: Which index to search? If this is specified, interval is set to 'none'
 * pattern :: Does nothing if index is specified. Set a timestamped index pattern. Default: [logstash-]YYYY.MM.DD
 * interval :: Sets the index interval (eg: day,week,month,year), Default: day
 *
 * split :: The character to split the queries on Default: ','
 * query :: By default, a comma separated list of queries to run. Default: *
 *
 * from :: Search this amount of time back, eg 15m, 1h, 2d. Default: 15m
 * timefield :: The field containing the time to filter on, Default: @timestamp
 *
 * fields :: comma separated list of fields to show in the table
 * sort :: comma separated field to sort on, and direction, eg sort=@timestamp,desc
 *
 */



// Setup some variables
var dashboard, queries, _d_timespan;

// All url parameters are available via the ARGS object
var ARGS;

// Set a default timespan if one isn't specified
_d_timespan = '1d';

// Intialize a skeleton with nothing but a rows array and service object
dashboard = {
  rows : [],
  services : {}
};

// Set a title
dashboard.title = 'WebAppLogs';
// Don't fail to default
dashboard.failover = false;
dashboard.index = {
  default: 'webapplogs*',
  interval: 'none',
  pattern: "[logstash-]YYYY.MM.DD",
  warm_fields: false
};

dashboard.editable = true;
dashboard.style = "dark";
dashboard.panel_hints = true;
dashboard.loader = {
  "save_gist": false,
  "save_elasticsearch": true,
  "save_local": true,
  "save_default": true,
  "save_temp": true,
  "save_temp_ttl_enable": true,
  "save_temp_ttl": "30d",
  "load_gist": true,
  "load_elasticsearch": true,
  "load_elasticsearch_size": 20,
  "load_local": true,
  "hide": false
};

queries = {
  0: {
    query: '*',
    id: 0,
  }
};

// Now populate the query service with our objects
dashboard.services.query = {
  list : queries,
  ids : _.map(_.keys(queries),function(v){return parseInt(v,10);})
};

// Lets also add a default time filter, the value of which can be specified by the user
dashboard.services.filter = {
  list: {
    0: {
      "type": "terms",
      "field": "webapp",
      "value": ARGS.webapp,
      "mandate": "must",
      "active": !_.isUndefined(ARGS.webapp),
      "alias": "",
      "id": 0
    },
    1: {
      "type": "time",
      "field": "timestamp",
      "from": "now-24h",
      "to": "now",
      "mandate": "must",
      "active": true,
      "alias": "",
      "id": 1
    }
  },
  ids: [0, 1]
};

// Ok, lets make some rows. The Filters row is collapsed by default
dashboard.rows = [
  {
    "title": "Graph",
    "height": "250px",
    "editable": true,
    "collapse": false,
    "collapsable": true
  },
  {
    "title": "Events",
    "height": "650px",
    "editable": true,
    "collapse": false,
    "collapsable": true,
    "notice": false
  }
];

// And a histogram that allows the user to specify the interval and time field
dashboard.rows[0].panels = [
  {
    "span": 12,
    "editable": true,
    "type": "histogram",
    "loadingEditor": false,
    "mode": "count",
    "time_field": "timestamp",
    "value_field": null,
    "x-axis": true,
    "y-axis": true,
    "scale": 1,
    "y_format": "none",
    "grid": {
      "max": null,
      "min": 0
    },
    "queries": {
      "mode": "all",
      "ids": [
        0
      ]
    },
    "annotate": {
      "enable": false,
      "query": "*",
      "size": 20,
      "field": "_type",
      "sort": [
        "_score",
        "desc"
      ]
    },
    "auto_int": false,
    "resolution": 100,
    "interval": "1m",
    "intervals": [
      "auto",
      "1s",
      "1m",
      "5m",
      "10m",
      "30m",
      "1h",
      "3h",
      "12h",
      "1d",
      "1w",
      "1y"
    ],
    "lines": false,
    "fill": 0,
    "linewidth": 3,
    "points": false,
    "pointradius": 5,
    "bars": true,
    "stack": true,
    "spyable": true,
    "zoomlinks": true,
    "options": true,
    "legend": true,
    "show_query": true,
    "interactive": true,
    "legend_counts": true,
    "timezone": "browser",
    "percentage": false,
    "zerofill": true,
    "derivative": false,
    "tooltip": {
      "value_type": "cumulative",
      "query_as_alias": true
    },
    "title": "Graph"
  }
];

// And a table row where you can specify field and sort order
dashboard.rows[1].panels = [{
  "error": false,
  "span": 12,
  "editable": true,
  "group": [
    "default"
  ],
  "type": "table",
  "size": 100,
  "pages": 5,
  "offset": 0,
  "sort": [
    "timestamp",
    "desc"
  ],
  "style": {
    "font-size": "9pt"
  },
  "overflow": "min-height",
  "fields": [
    "webapp",
    "level",
    "timestamp",
    "source",
    "message"
  ],
  "highlight": [],
  "sortable": true,
  "header": true,
  "paging": true,
  "spyable": true,
  "queries": {
    "mode": "all",
    "ids": [
      0
    ]
  },
  "field_list": true,
  "status": "Stable",
  "trimFactor": 300,
  "normTimes": true,
  "title": "Documents",
  "all_fields": false,
  "localTime": false,
  "timeField": "timestamp"
}];

if(!_.isUndefined(ARGS.webapp)) {
  dashboard.rows[0].panels.title = "Documents with chosen webapp:"+ARGS.webapp;
}

dashboard.nav = [{
  "type": "timepicker",
  "collapse": false,
  "notice": false,
  "status": "Stable",
  "time_options": [
    "5m",
    "15m",
    "1h",
    "6h",
    "12h",
    "24h",
    "2d",
    "7d",
    "30d"
  ],
  "refresh_intervals": [
    "5s",
    "10s",
    "30s",
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "1d"
  ],
  "timefield": "timestamp",
  "enable": true,
  "now": true,
  "filter_id": 1
}];

// Now return the object and we're good!
return dashboard;
