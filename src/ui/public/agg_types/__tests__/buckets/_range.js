import { values } from 'ui/lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { RANGE_RESPONSE } from './fixtures/range_response';
import { VisProvider } from 'ui/vis';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';

describe('Range Agg', function () {
  const buckets = values(RANGE_RESPONSE.aggregations[1].buckets);

  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(StubLogstashIndexPatternProvider);
    indexPattern.stubSetFieldFormat('bytes', 'bytes', {
      pattern: '0,0.[000] b'
    });
  }));

  describe('formating', function () {
    it('formats bucket keys properly', function () {
      const vis = new Vis(indexPattern, {
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

      const agg = vis.aggs.byTypeName.range[0];
      const format = function (val) {
        return agg.fieldFormatter()(agg.getKey(val));
      };
      expect(format(buckets[0])).to.be('-∞ to 1 KB');
      expect(format(buckets[1])).to.be('1 KB to 2.5 KB');
      expect(format(buckets[2])).to.be('2.5 KB to +∞');

    });
  });
});
