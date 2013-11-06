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
  rows : [],
  services : {}
};

// Set a title
dashboard.title = 'Node Statistics';

// And the index options
dashboard.failover = false;
dashboard.index = {
  default: 'ADD_A_TIME_FILTER',
  pattern: '[es_monitor-]YYYY.MM.DD',
  interval: 'day'
};

// In this dashboard we let users pass nodes as comma seperated list to the query parameter.
// If nodes are defined, split into a list of query objects, otherwise, show all
// NOTE: ids must be integers, hence the parseInt()s
if(!_.isUndefined(ARGS.nodes)) {
  queries = _.object(_.map(ARGS.nodes.split(','), function(v,k) {
    return [k,{
      query: 'node.transport_address:"'+v+'"',
      alias: v,
      pin: true,
      id: parseInt(k,10)
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
  ids : _.map(_.keys(queries),function(v){return parseInt(v,10);}),
};

// Lets also add a default time filter, the value of which can be specified by the user
dashboard.services.filter = {
  list: {
    0: {
      from: "now-"+(ARGS.from||_d_timespan),
      to: "now",
      field: "@timestamp",
      type: "time",
      active: true,
      id: 0,
    }
  },
  ids: [0]
};

// Ok, lets make some rows. Since all of our panels are similar, we can abstract this.
// Obviously this is a partial list, feel free to expand on this.
var rows = [
  {
    name:'OS',
    charts: [{
      title: 'CPU',
      field: 'os.cpu.user',
      derivative: false,
    },{
      title: 'Memory',
      field: 'os.mem.used_percent',
      derivative: false
    },{
      title: 'Swap',
      field: 'os.swap.used_in_bytes',
      derivative: true
    }]
  },
  {
    name: 'JVM',
    charts: [{
      title: 'New Generation GC Time',
      field: 'jvm.gc.collectors.ParNew.collection_time_in_millis',
      derivative: true
    },{
      title: 'New Generation GC Count',
      field: 'jvm.gc.collectors.ParNew.collection_count',
      derivative: true
    },{
      title: 'Old Generation GC Time',
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
      // A bunch of histogram panels, with similar defaults
      return {
        title: c.title,
        type: 'histogram',
        span: 4,
        time_field: '@timestamp',
        value_field: c.field,
        derivative: c.derivative,
        bars: false,
        lines: true,
        stack: false,
        fill: 0,
        linewidth: 2,
        mode: 'max', // Pretty sure we want max for all of these? No? Average for some?
        zoomlinks: false,
        options: false,
        legend: false, // Might want to enable this, cleaner without it though
        interactive: false // Because the filter pulldown is hidden
      };
    })
  };
});

// No pulldowns shown, and they can't be enabled.
dashboard.pulldowns = [{type:'query'}];

// Now return the object and we're good!
return dashboard;
