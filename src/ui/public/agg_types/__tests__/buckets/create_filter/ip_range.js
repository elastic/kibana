import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterIpRange } from '../../../buckets/create_filter/ip_range';
describe('AggConfig Filters', function () {

  describe('IP range', function () {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    }));

    it('should return a range filter for ip_range agg', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'ip_range',
            schema: 'segment',
            params: {
              field: 'ip',
              ipRangeType: 'fromTo',
              ranges: {
                fromTo: [
                  { from: '0.0.0.0', to: '1.1.1.1' }
                ]
              }
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.ip_range[0];
      const filter = createFilterIpRange(aggConfig, '0.0.0.0 to 1.1.1.1');
      expect(filter).to.have.property('range');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.range).to.have.property('ip');
      expect(filter.range.ip).to.have.property('gte', '0.0.0.0');
      expect(filter.range.ip).to.have.property('lte', '1.1.1.1');
    });

    it('should return a range filter for ip_range agg using a CIDR mask', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'ip_range',
            schema: 'segment',
            params: {
              field: 'ip',
              ipRangeType: 'mask',
              ranges: {
                mask: [
                  { mask: '67.129.65.201/27' }
                ]
              }
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.ip_range[0];
      const filter = createFilterIpRange(aggConfig, '67.129.65.201/27');
      expect(filter).to.have.property('range');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.range).to.have.property('ip');
      expect(filter.range.ip).to.have.property('gte', '67.129.65.192');
      expect(filter.range.ip).to.have.property('lte', '67.129.65.223');
    });
  });
});
