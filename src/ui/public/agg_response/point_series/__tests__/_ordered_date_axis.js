describe('orderedDateAxis', function () {
  var moment = require('moment');
  var _ = require('lodash');
  var sinon = require('auto-release-sinon');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var baseArgs = {
    vis: {
      indexPattern: {
        timeFieldName: '@timestamp'
      }
    },
    chart: {
      aspects: {
        x: {
          agg: {
            fieldIsTimeField: _.constant(true),
            buckets: {
              getScaledDateFormat: _.constant('hh:mm:ss'),
              getInterval: _.constant(moment.duration(15, 'm')),
              getBounds: _.constant({ min: moment().subtract(15, 'm'), max: moment() })
            }
          }
        }
      }
    }
  };

  var orderedDateAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    orderedDateAxis = Private(require('ui/agg_response/point_series/_ordered_date_axis'));
  }));

  describe('xAxisFormatter', function () {
    it('sets the xAxisFormatter', function () {
      var args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      expect(args.chart).to.have.property('xAxisFormatter');
      expect(args.chart.xAxisFormatter).to.be.a('function');
    });

    it('formats values using moment, and returns strings', function () {
      var args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      var val = '2014-08-06T12:34:01';
      expect(args.chart.xAxisFormatter(val))
        .to.be(moment(val).format('hh:mm:ss'));
    });
  });

  describe('ordered object', function () {
    it('sets date: true', function () {
      var args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);

      expect(args.chart)
        .to.have.property('ordered');

      expect(args.chart.ordered)
        .to.have.property('date', true);
    });

    it('relies on agg.buckets for the interval', function () {
      var args = _.cloneDeep(baseArgs);
      var spy = sinon.spy(args.chart.aspects.x.agg.buckets, 'getInterval');
      orderedDateAxis(args.vis, args.chart);
      expect(spy).to.have.property('callCount', 1);
    });

    it('sets the min/max when the buckets are bounded', function () {
      var args = _.cloneDeep(baseArgs);
      orderedDateAxis(args.vis, args.chart);
      expect(moment.isMoment(args.chart.ordered.min)).to.be(true);
      expect(moment.isMoment(args.chart.ordered.max)).to.be(true);
    });

    it('does not set the min/max when the buckets are unbounded', function () {
      var args = _.cloneDeep(baseArgs);
      args.chart.aspects.x.agg.buckets.getBounds = _.constant();
      orderedDateAxis(args.vis, args.chart);
      expect(args.chart.ordered).to.not.have.property('min');
      expect(args.chart.ordered).to.not.have.property('max');
    });
  });
});
