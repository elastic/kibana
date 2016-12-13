import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import VisProvider from 'ui/vis';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import AggTypesIndexProvider from 'ui/agg_types/index';
import VisAggConfigProvider from 'ui/vis/agg_config';
import AggTypesBucketsBucketCountBetweenProvider from 'ui/agg_types/buckets/_bucket_count_between';
describe('bucketCountBetween util', function () {
  let indexPattern;
  let Vis;
  let visTypes;
  let aggTypes;
  let AggConfig;
  let bucketCountBetween;

  // http://cwestblog.com/2014/02/25/javascript-testing-for-negative-zero/
  // works for -0 and +0
  function isNegative(n) {
    return ((n = +n) || 1 / n) < 0;
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    Vis = Private(VisProvider);
    visTypes = Private(RegistryVisTypesProvider);
    aggTypes = Private(AggTypesIndexProvider);
    AggConfig = Private(VisAggConfigProvider);
    bucketCountBetween = Private(AggTypesBucketsBucketCountBetweenProvider);
  }));

  it('returns a positive number when a is before b', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        },
        {
          type: 'terms',
          schema: 'segment'
        }
      ]
    });

    const a = vis.aggs.byTypeName.date_histogram[0];
    const b = vis.aggs.byTypeName.terms[0];
    const count = bucketCountBetween(a, b);
    expect(isNegative(count)).to.be(false);
  });

  it('returns a negative number when a is after b', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        },
        {
          type: 'terms',
          schema: 'segment'
        }
      ]
    });

    const a = vis.aggs.byTypeName.terms[0];
    const b = vis.aggs.byTypeName.date_histogram[0];
    const count = bucketCountBetween(a, b);
    expect(isNegative(count)).to.be(true);
  });

  it('returns 0 when there are no buckets between a and b', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        },
        {
          type: 'terms',
          schema: 'segment'
        }
      ]
    });

    const a = vis.aggs.byTypeName.date_histogram[0];
    const b = vis.aggs.byTypeName.terms[0];
    expect(bucketCountBetween(a, b)).to.be(0);
  });

  it('returns null when b is not in the aggs', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        }
      ]
    });

    const a = vis.aggs.byTypeName.date_histogram[0];
    const b = new AggConfig(vis, {
      type: 'terms',
      schema: 'segment'
    });

    expect(bucketCountBetween(a, b)).to.be(null);
  });

  it('returns null when a is not in the aggs', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        {
          type: 'date_histogram',
          schema: 'segment'
        }
      ]
    });

    const a = new AggConfig(vis, {
      type: 'terms',
      schema: 'segment'
    });
    const b = vis.aggs.byTypeName.date_histogram[0];

    expect(bucketCountBetween(a, b)).to.be(null);
  });

  it('returns null when a and b are not in the aggs', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: []
    });

    const a = new AggConfig(vis, {
      type: 'terms',
      schema: 'segment'
    });

    const b = new AggConfig(vis, {
      type: 'date_histogram',
      schema: 'segment'
    });

    expect(bucketCountBetween(a, b)).to.be(null);
  });

  function countTest(pre, post) {
    return function () {
      const schemas = visTypes.byName.histogram.schemas.buckets;

      // slow for this test is actually somewhere around 1/2 a sec
      this.slow(500);

      function randBucketAggForVis(vis) {
        const schema = _.sample(schemas);
        const aggType = _.sample(aggTypes.byType.buckets);

        return new AggConfig(vis, {
          schema: schema,
          type: aggType
        });
      }

      _.times(50, function (n) {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: []
        });

        const randBucketAgg = _.partial(randBucketAggForVis, vis);

        const a = randBucketAgg();
        const b = randBucketAgg();

        // create n aggs between a and b
        const aggs = [];
        aggs.fill = function (n) {
          for (let i = 0; i < n; i++) {
            aggs.push(randBucketAgg());
          }
        };

        pre && aggs.fill(_.random(0, 10));
        aggs.push(a);
        aggs.fill(n);
        aggs.push(b);
        post && aggs.fill(_.random(0, 10));

        vis.setState({
          type: 'histogram',
          aggs: aggs
        });

        expect(bucketCountBetween(a, b)).to.be(n);
      });
    };
  }

  it('can count', countTest());
  it('can count with elements before', countTest(true));
  it('can count with elements after', countTest(false, true));
  it('can count with elements before and after', countTest(true, true));
});
