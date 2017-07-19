import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggTypeMetricMedianProvider class', function () {
  let indexPattern;
  let aggDsl;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    const vis = new Vis(indexPattern, {
      'title': 'New Visualization',
      'type': 'metric',
      'params': {
        'fontSize': 60,
        'handleNoResults': true
      },
      'aggs': [
        {
          'id': '1',
          'type': 'median',
          'schema': 'metric',
          'params': {
            'field': 'bytes',
            'percents': [
              50
            ]
          }
        }
      ],
      'listeners': {}
    });

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    const aggConfig = vis.aggs[0];
    aggDsl = aggConfig.toDsl();
  }));

  it('requests the percentiles aggregation in the Elasticsearch query DSL', function () {
    expect(Object.keys(aggDsl)[0]).to.be('percentiles');
  });

  it ('asks Elasticsearch for the 50th percentile', function () {
    expect(aggDsl.percentiles.percents).to.eql([50]);
  });

  it ('asks Elasticsearch for array-based values in the aggregation response', function () {
    expect(aggDsl.percentiles.keyed).to.be(false);
  });
});
