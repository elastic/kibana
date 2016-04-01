let _ = require('lodash');
let expect = require('expect.js');
let ngMock = require('ngMock');

describe('calculateInterval()', function () {
  let AggConfig;
  let indexPattern;
  let Vis;
  let createFilter;
  let calculateInterval;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(require('ui/Vis'));
    AggConfig = Private(require('ui/Vis/AggConfig'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    calculateInterval = Private(require('ui/agg_types/param_types/_calculate_interval'));
  }));

  let testInterval = function (option, expected) {
    let msg = 'should return ' + JSON.stringify(expected) + ' for ' + option;
    it(msg, function () {
      let vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp', interval: option } } ]
      });
      let aggConfig = vis.aggs.byTypeName.date_histogram[0];
      let interval = calculateInterval(aggConfig);
      _.each(expected, function (val, key) {
        expect(interval).to.have.property(key, val);
      });
    });

  };

  testInterval('auto', {
    interval: 30000,
    metricScale: 1,
    description: '30 sec'
  });

  testInterval('second', {
    interval: 10000,
    metricScale: 0.1,
    description: 'second'
  });

  testInterval('minute', {
    interval: 60000,
    metricScale: 1,
    description: 'minute'
  });

  testInterval('hour', {
    interval: 3600000,
    metricScale: 1,
    description: 'hour'
  });

  testInterval('day', {
    interval: 86400000,
    metricScale: 1,
    description: 'day'
  });

  testInterval('week', {
    interval: 604800000,
    metricScale: 1,
    description: 'week'
  });

  testInterval('month', {
    interval: 2592000000,
    metricScale: 1,
    description: 'month'
  });

  testInterval('year', {
    interval: 31536000000,
    metricScale: 1,
    description: 'year'
  });

});
