describe('Range Agg', function () {
  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');
  var values = require('lodash').values;

  var resp = require('fixtures/agg_resp/range');
  var buckets = values(resp.aggregations[1].buckets);

  var range;
  var Vis;
  var indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    range = Private(require('ui/agg_types/index')).byName.range;
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    var BytesFormat = Private(require('ui/registry/field_formats')).byId.bytes;

    indexPattern.fieldFormatMap.bytes = new BytesFormat({
      pattern: '0,0.[000] b'
    });

    indexPattern._indexFields();
  }));

  describe('formating', function () {
    it('formats bucket keys properly', function () {
      var vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'range',
            schema: 'segment',
            params: {
              field: 'bytes',
              ranges: [
                { from: 0, to: 1000 },
                { from: 1000, to: 2000 }
              ]
            }
          }
        ]
      });

      var agg = vis.aggs.byTypeName.range[0];
      var format = function (val) {
        return agg.fieldFormatter()(agg.getKey(val));
      };
      expect(format(buckets[0])).to.be('-∞ to 1 KB');
      expect(format(buckets[1])).to.be('1 KB to 2.5 KB');
      expect(format(buckets[2])).to.be('2.5 KB to +∞');

    });
  });
});
