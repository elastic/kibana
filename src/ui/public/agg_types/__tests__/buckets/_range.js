describe('Range Agg', function () {
  let _ = require('lodash');
  let ngMock = require('ngMock');
  let expect = require('expect.js');
  let values = require('lodash').values;

  let resp = require('fixtures/agg_resp/range');
  let buckets = values(resp.aggregations[1].buckets);

  let range;
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    range = Private(require('ui/agg_types/index')).byName.range;
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    let BytesFormat = Private(require('ui/registry/field_formats')).byId.bytes;

    indexPattern.fieldFormatMap.bytes = new BytesFormat({
      pattern: '0,0.[000] b'
    });

    indexPattern._indexFields();
  }));

  describe('formating', function () {
    it('formats bucket keys properly', function () {
      let vis = new Vis(indexPattern, {
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

      let agg = vis.aggs.byTypeName.range[0];
      let format = function (val) {
        return agg.fieldFormatter()(agg.getKey(val));
      };
      expect(format(buckets[0])).to.be('-∞ to 1 KB');
      expect(format(buckets[1])).to.be('1 KB to 2.5 KB');
      expect(format(buckets[2])).to.be('2.5 KB to +∞');

    });
  });
});
