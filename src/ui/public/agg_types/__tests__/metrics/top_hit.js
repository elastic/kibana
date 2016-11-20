import expect from 'expect.js';
import ngMock from 'ng_mock';
import TopHitProvider from 'ui/agg_types/metrics/top_hit';
import VisProvider from 'ui/vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

describe('Top hit metric', function () {
  let aggDsl;
  let topHitMetric;
  let aggConfig;

  function init({ field, sortOrder }) {
    ngMock.module('kibana');
    ngMock.inject(function (Private) {
      const Vis = Private(VisProvider);
      const indexPattern = Private(StubbedIndexPattern);
      topHitMetric = Private(TopHitProvider);

      const params = {};
      if (field) {
        params.field = field;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const vis = new Vis(indexPattern, {
        title: 'New Visualization',
        type: 'metric',
        params: {
          fontSize: 60,
          handleNoResults: true
        },
        aggs: [
          {
            id: '1',
            type: 'top_hits',
            schema: 'metric',
            params
          }
        ],
        listeners: {}
      });

      // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
      aggConfig = vis.aggs[0];
      aggDsl = aggConfig.toDsl();
    });
  }

  it ('should return a label prefixed with Last if sorting in descending order', function () {
    init({ field: 'bytes' });
    expect(topHitMetric.makeLabel(aggConfig)).to.eql('Last bytes');
  });

  it ('should return a label prefixed with First if sorting in ascending order', function () {
    init({
      field: 'bytes',
      sortOrder: {
        val: 'asc'
      }
    });
    expect(topHitMetric.makeLabel(aggConfig)).to.eql('First bytes');
  });

  it ('should request both for the source and doc_values fields', function () {
    init({ field: 'bytes' });
    expect(aggDsl.top_hits._source).to.be('bytes');
    expect(aggDsl.top_hits.docvalue_fields).to.eql([ 'bytes' ]);
  });

  it ('should only request for the source if the field is an IP', function () {
    init({ field: 'ip' });
    expect(aggDsl.top_hits._source).to.be('ip');
    expect(aggDsl.top_hits.docvalue_fields).to.be(undefined);
  });

  describe('try to get the value from the top hit', function () {
    it ('should return null if there is no hit', function () {
      const bucket = {
        '1': {
          hits: {
            hits: []
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.be(null);
    });

    it ('should return undefined if the field does not appear in the source', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  bytes: 123
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.be(undefined);
    });

    it ('should return the field value from the top hit', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': 'aaa'
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.be('aaa');
    });

    it ('should return the object if the field value is an object', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': {
                    label: 'aaa'
                  }
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.eql({ label: 'aaa' });
    });

    it ('should return an array if the field has more than one values', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': [ 'aaa', 'bbb' ]
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.eql([ 'aaa', 'bbb' ]);
    });

    it ('should get the value from the doc_values field if the source does not have that field', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                },
                fields: {
                  'machine.os': [ 'linux' ]
                }
              }
            ]
          }
        }
      };

      init({ field: 'machine.os' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.be('linux');
    });

    it ('should return null if the field is not in the source nor in the doc_values field', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  nope: 'aaa'
                },
                fields: {
                  nope: [ 'aaa' ]
                }
              }
            ]
          }
        }
      };

      init({ field: 'machine.os' });
      expect(topHitMetric.getValue(aggConfig, bucket)).to.be(null);
    });
  });
});
