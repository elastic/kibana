import _ from 'lodash';
import moment from 'moment';
import aggResp from 'fixtures/agg_resp/date_histogram';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggTypesBucketsCreateFilterDateHistogramProvider } from 'ui/agg_types/buckets/create_filter/date_histogram';
import { AggTypesBucketsIntervalOptionsProvider } from 'ui/agg_types/buckets/_interval_options';

describe('AggConfig Filters', function () {
  describe('date_histogram', function () {
    let vis;
    let agg;
    let field;
    let filter;
    let bucketKey;
    let bucketStart;
    let intervalOptions;

    let init;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      const Vis = Private(VisProvider);
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      const createFilter = Private(AggTypesBucketsCreateFilterDateHistogramProvider);
      intervalOptions = Private(AggTypesBucketsIntervalOptionsProvider);

      init = function (interval, duration) {
        interval = interval || 'auto';
        if (interval === 'custom') interval = agg.params.customInterval;
        duration = duration || moment.duration(15, 'minutes');
        field = _.sample(_.reject(indexPattern.fields.byType.date, 'scripted'));
        vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_histogram',
              schema: 'segment',
              params: { field: field.name, interval: interval, customInterval: '5d' }
            }
          ]
        });

        agg = vis.aggs[0];
        bucketKey = _.sample(aggResp.aggregations['1'].buckets).key;
        bucketStart = moment(bucketKey);

        const timePad = moment.duration(duration / 2);
        agg.buckets.setBounds({
          min: bucketStart.clone().subtract(timePad),
          max: bucketStart.clone().add(timePad),
        });
        agg.buckets.setInterval(interval);

        filter = createFilter(agg, bucketKey);
      };
    }));

    it('creates a valid range filter', function () {
      init();

      expect(filter).to.have.property('range');
      expect(filter.range).to.have.property(field.name);

      const fieldParams = filter.range[field.name];
      expect(fieldParams).to.have.property('gte');
      expect(fieldParams.gte).to.be.a('number');

      expect(fieldParams).to.have.property('lt');
      expect(fieldParams.lt).to.be.a('number');

      expect(fieldParams).to.have.property('format');
      expect(fieldParams.format).to.be('epoch_millis');

      expect(fieldParams.gte).to.be.lessThan(fieldParams.lt);

      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', vis.indexPattern.id);
    });


    it('extends the filter edge to 1ms before the next bucket for all interval options', function () {
      intervalOptions.forEach(function (option) {
        let duration;
        if (option.val !== 'custom' && moment(1, option.val).isValid()) {
          duration = moment.duration(10, option.val);

          if (+duration < 10) {
            throw new Error('unable to create interval for ' + option.val);
          }
        }

        init(option.val, duration);

        const interval = agg.buckets.getInterval();
        const params = filter.range[field.name];

        expect(params.gte).to.be(+bucketStart);
        expect(params.lt).to.be(+bucketStart.clone().add(interval));
      });
    });
  });
});
