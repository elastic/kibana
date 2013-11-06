/* global _ */

/*
 * Complex scripted dashboard
 * This script generates a dashboard object that Kibana can load. It also takes a number of user
 * supplied URL parameters, none are required:
 *
 * index :: Which index to search? If this is specified, interval is set to 'none'
 * pattern :: Does nothing if index is specified. Set a timestamped index pattern. Default: [logstash-]YYYY.MM.DD
 * interval :: Sets the index interval (eg: day,week,month,year), Default: day
 *
 * split :: The character to split the queries on Default: ','
 * query :: By default, a comma seperated list of queries to run. Default: *
 *
 * from :: Search this amount of time back, eg 15m, 1h, 2d. Default: 15m
 * timefield :: The field containing the time to filter on, Default: @timestamp
 *
 * fields :: comma seperated list of fields to show in the table
 * sort :: comma seperated field to sort on, and direction, eg sort=@timestamp,desc
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
  rows : [],
  services : {}
};

// Set a title
dashboard.title = 'Node Statistics';


dashboard.failover = false;
dashboard.index = {
  default: ARGS.index||'ADD_A_TIME_FILTER',
  pattern: ARGS.pattern||'[es_monitor-]YYYY.MM.DD',
  interval: ARGS.interval||'day'
};

// In this dashboard we let users pass queries as comma seperated list to the query parameter.
// If query is defined, split it into a list of query objects
// NOTE: ids must be integers, hence the parseInt()s
if(!_.isUndefined(ARGS.nodes)) {
  queries = _.object(_.map(ARGS.nodes.split(','), function(v,k) {
    return [k,{
      query: 'node.transport_address:"'+v+'"',
      id: parseInt(k,10),
      alias: v
    }];
  }));
} else {
  // No queries passed? Initialize a single query to match everything
  queries = {
    0: {
      query: '*',
      id: 0,
    }
  };
}

var show = ARGS.show.split(',') || [];

// Now populate the query service with our objects
dashboard.services.query = {
  list : queries,
  ids : _.map(_.keys(queries),function(v){return parseInt(v,10);})
};

// Lets also add a default time filter, the value of which can be specified by the user
dashboard.services.filter = {
  list: {
    0: {
      from: "now-"+(ARGS.from||_d_timespan),
      to: "now",
      field: ARGS.timefield||"@timestamp",
      type: "time",
      active: true,
      id: 0,
    }
  },
  ids: [0]
};

// Ok, lets make some rows. The Filters row is collapsed by default
var rows = [
  {
    name:'OS',
    charts: [{
      field: 'os.cpu.user',
      derivative: false,
    },{
      field: 'os.mem.used_percent',
      derivative: false
    },{
      field: 'os.swap.used_in_bytes',
      derivative: true
    }]
  },
  {
    name: 'JVM',
    charts: [{
      field: 'jvm.gc.collectors.ParNew.collection_time_in_millis',
      derivative: true
    },{
      field: 'jvm.gc.collectors.ParNew.collection_count',
      derivative: true
    },{
      field: 'jvm.gc.collectors.ConcurrentMarkSweep.collection_time_in_millis',
      derivative: true
    }]
  }
];

dashboard.rows = _.map(rows, function(r) {
  return {
    title: r.name,
    height: '150px',
    collapse: !_.contains(show,r.name),
    panels: _.map(r.charts,function(c) {
      return {
        title: c.field,
        type: 'histogram',
        span: 4,
        time_field: '@timestamp',
        value_field: c.field,
        derivative: c.derivative,
        bars: false,
        lines: true,
        stack: false,
        linewidth:2,
        mode: 'max',
        zoomlinks: false,
        options: false,
        legend: false,
        interactive: false
      };
    })
  };
});

// No pulldowns available, and they can't be enabled.
dashboard.pulldowns = [];

// Now return the object and we're good!
return dashboard;
