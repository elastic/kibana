import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggTypeMetricStandardDeviationProvider from 'ui/agg_types/metrics/std_deviation';
import VisProvider from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggTypeMetricStandardDeviationProvider class', function () {

  let Vis;
  let indexPattern;
  let aggTypeMetricStandardDeviation;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    aggTypeMetricStandardDeviation = Private(AggTypeMetricStandardDeviationProvider);
  }));

  it('uses the custom label if it is set', function () {
    let vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    let aggConfig = vis.aggs[0];
    aggConfig.params.customLabel = 'custom label';
    aggConfig.params.field = {
      displayName: 'memory'
    };

    let responseAggs = aggTypeMetricStandardDeviation.getResponseAggs(aggConfig);
    let lowerStdDevLabel = responseAggs[0].makeLabel();
    let avgLabel = responseAggs[1].makeLabel();
    let upperStdDevLabel = responseAggs[2].makeLabel();

    expect(lowerStdDevLabel).to.be('Lower custom label');
    expect(avgLabel).to.be('Average of memory'); // not expected to use custom label
    expect(upperStdDevLabel).to.be('Upper custom label');
  });

  it('uses the default labels if custom label is not set', function () {
    let vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    let aggConfig = vis.aggs[0];
    aggConfig.params.field = {
      displayName: 'memory'
    };

    let responseAggs = aggTypeMetricStandardDeviation.getResponseAggs(aggConfig);
    let lowerStdDevLabel = responseAggs[0].makeLabel();
    let avgLabel = responseAggs[1].makeLabel();
    let upperStdDevLabel = responseAggs[2].makeLabel();

    expect(lowerStdDevLabel).to.be('Lower Standard Deviation of memory');
    expect(avgLabel).to.be('Average of memory'); // not expected to use custom label
    expect(upperStdDevLabel).to.be('Upper Standard Deviation of memory');
  });

});
