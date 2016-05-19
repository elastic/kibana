import { values } from 'lodash';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import resp from 'fixtures/agg_resp/range';
import AggTypesIndexProvider from 'ui/agg_types/index';
import VisProvider from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('Range Agg', function () {

  let buckets = values(resp.aggregations[1].buckets);

  let range;
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    range = Private(AggTypesIndexProvider).byName.range;
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    let BytesFormat = Private(RegistryFieldFormatsProvider).byId.bytes;

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
