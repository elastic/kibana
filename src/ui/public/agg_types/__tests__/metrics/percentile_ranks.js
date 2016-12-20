describe('AggTypeMetricPercentileRanksProvider class', function () {
  let ngMock = require('ngMock');
  let expect = require('expect.js');

  let Vis;
  let indexPattern;
  let aggTypeMetricPercentileRanks;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    aggTypeMetricPercentileRanks = Private(require('ui/agg_types/metrics/percentile_ranks'));
  }));

  it('uses the custom label if it is set', function () {
    const vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    const aggConfig = vis.aggs[0];
    aggConfig.params.customLabel = 'my custom field label';
    aggConfig.params.values = [ 5000, 10000 ];
    aggConfig.params.field = {
      displayName: 'bytes'
    };

    const responseAggs = aggTypeMetricPercentileRanks.getResponseAggs(aggConfig);
    const percentileRankLabelFor5kBytes = responseAggs[0].makeLabel();
    const percentileRankLabelFor10kBytes = responseAggs[1].makeLabel();

    expect(percentileRankLabelFor5kBytes).to.be('Percentile rank 5,000 of "my custom field label"');
    expect(percentileRankLabelFor10kBytes).to.be('Percentile rank 10,000 of "my custom field label"');
  });

});
