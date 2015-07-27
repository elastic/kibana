
var moment = require('moment');
var ngMock = require('ngMock');
var expect = require('expect.js');
describe('Filter Bar Directive', function () {
  describe('changeTimeFilter()', function () {

    var changeTimeFilter, timefilter;

    beforeEach(ngMock.module('kibana'));

    beforeEach(ngMock.inject(function (Private, _timefilter_) {
      changeTimeFilter = Private(require('ui/filter_bar/lib/changeTimeFilter'));
      timefilter = _timefilter_;
    }));

    it('should change the timefilter to match the range gt/lt', function () {
      var filter = { range: { '@timestamp': { gt: 1388559600000, lt: 1388646000000 } } };
      changeTimeFilter(filter);
      expect(timefilter.time.mode).to.be('absolute');
      expect(moment.isMoment(timefilter.time.to)).to.be(true);
      expect(timefilter.time.to.isSame('2014-01-02'));
      expect(moment.isMoment(timefilter.time.from)).to.be(true);
      expect(timefilter.time.from.isSame('2014-01-01'));
    });

    it('should change the timefilter to match the range gte/lte', function () {
      var filter = { range: { '@timestamp': { gte: 1388559600000, lte: 1388646000000 } } };
      changeTimeFilter(filter);
      expect(timefilter.time.mode).to.be('absolute');
      expect(moment.isMoment(timefilter.time.to)).to.be(true);
      expect(timefilter.time.to.isSame('2014-01-02'));
      expect(moment.isMoment(timefilter.time.from)).to.be(true);
      expect(timefilter.time.from.isSame('2014-01-01'));
    });

  });
});
