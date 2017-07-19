
import moment from 'moment';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { FilterBarLibChangeTimeFilterProvider } from 'ui/filter_bar/lib/change_time_filter';

describe('Filter Bar Directive', function () {
  describe('changeTimeFilter()', function () {

    let changeTimeFilter;

    let timefilter;

    beforeEach(ngMock.module('kibana'));

    beforeEach(ngMock.inject(function (Private, _timefilter_) {
      changeTimeFilter = Private(FilterBarLibChangeTimeFilterProvider);
      timefilter = _timefilter_;
    }));

    it('should change the timefilter to match the range gt/lt', function () {
      const filter = { range: { '@timestamp': { gt: 1388559600000, lt: 1388646000000 } } };
      changeTimeFilter(filter);
      expect(timefilter.time.mode).to.be('absolute');
      expect(moment.isMoment(timefilter.time.to)).to.be(true);
      expect(timefilter.time.to.isSame('2014-01-02'));
      expect(moment.isMoment(timefilter.time.from)).to.be(true);
      expect(timefilter.time.from.isSame('2014-01-01'));
    });

    it('should change the timefilter to match the range gte/lte', function () {
      const filter = { range: { '@timestamp': { gte: 1388559600000, lte: 1388646000000 } } };
      changeTimeFilter(filter);
      expect(timefilter.time.mode).to.be('absolute');
      expect(moment.isMoment(timefilter.time.to)).to.be(true);
      expect(timefilter.time.to.isSame('2014-01-02'));
      expect(moment.isMoment(timefilter.time.from)).to.be(true);
      expect(timefilter.time.from.isSame('2014-01-01'));
    });

  });
});
