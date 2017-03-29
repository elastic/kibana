import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VisProvider from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import AggTypesParamTypesCalculateIntervalProvider from 'ui/agg_types/param_types/_calculate_interval';

describe('calculateInterval()', function () {
  let indexPattern;
  let Vis;
  let calculateInterval;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    calculateInterval = Private(AggTypesParamTypesCalculateIntervalProvider);
  }));

  const testInterval = function (option, expected) {
    const msg = 'should return ' + JSON.stringify(expected) + ' for ' + option;
    it(msg, function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp', interval: option } } ]
      });
      const aggConfig = vis.aggs.byTypeName.date_histogram[0];
      const interval = calculateInterval(aggConfig);
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
