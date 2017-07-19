import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesMetricsPercentilesProvider } from 'ui/agg_types/metrics/percentiles';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggTypesMetricsPercentilesProvider class', function () {

  let Vis;
  let indexPattern;
  let aggTypeMetricPercentiles;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    aggTypeMetricPercentiles = Private(AggTypesMetricsPercentilesProvider);
  }));

  it('uses the custom label if it is set', function () {
    const vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    const aggConfig = vis.aggs[0];
    aggConfig.params.customLabel = 'prince';
    aggConfig.params.percents = [ 95 ];
    aggConfig.params.field = {
      displayName: 'bytes'
    };

    const responseAggs = aggTypeMetricPercentiles.getResponseAggs(aggConfig);
    const ninetyFifthPercentileLabel = responseAggs[0].makeLabel();

    expect(ninetyFifthPercentileLabel).to.be('95th percentile of prince');
  });

});
