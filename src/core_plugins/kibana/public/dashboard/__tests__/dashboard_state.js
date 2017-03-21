import ngMock from 'ng_mock';
import expect from 'expect.js';

import '../dashboard_state';

describe('DashboardState', function () {
  let savedDashboard;
  let SavedDashboard;
  let timefilter;

  function initDashboardState() {}

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    timefilter = $injector.get('timefilter');
    SavedDashboard = $injector.get('SavedDashboard');
    savedDashboard = new SavedDashboard();
  }));

  describe('timefilter', function () {

    describe('when timeRestore is true', function () {
      it('syncs quick time', function () {
        savedDashboard.timeRestore = true;
        savedDashboard.timeFrom = 'now/w';
        savedDashboard.timeTo = 'now/w';

        timefilter.time.from = '2015-09-19 06:31:44.000';
        timefilter.time.to = '2015-09-29 06:31:44.000';
        timefilter.time.mode = 'absolute';

        initDashboardState();

        expect(timefilter.time.mode).to.equal('quick');
        expect(timefilter.time.to).to.equal('now/w');
        expect(timefilter.time.from).to.equal('now/w');
      });

      it('syncs relative time', function () {
        savedDashboard.timeRestore = true;
        savedDashboard.timeFrom = 'now-13d';
        savedDashboard.timeTo = 'now';

        timefilter.time.from = '2015-09-19 06:31:44.000';
        timefilter.time.to = '2015-09-29 06:31:44.000';
        timefilter.time.mode = 'absolute';

        initDashboardState();

        expect(timefilter.time.mode).to.equal('relative');
        expect(timefilter.time.to).to.equal('now');
        expect(timefilter.time.from).to.equal('now-13d');
      });

      it('syncs absolute time', function () {
        savedDashboard.timeRestore = true;
        savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
        savedDashboard.timeTo = '2015-09-29 06:31:44.000';

        timefilter.time.from = 'now/w';
        timefilter.time.to = 'now/w';
        timefilter.time.mode = 'quick';

        initDashboardState();

        expect(timefilter.time.mode).to.equal('absolute');
        expect(timefilter.time.to).to.equal(savedDashboard.timeTo);
        expect(timefilter.time.from).to.equal(savedDashboard.timeFrom);
      });
    });

    it('is not synced when timeRestore is false', function () {
      savedDashboard.timeRestore = false;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      timefilter.time.timeFrom = '2015-09-19 06:31:44.000';
      timefilter.time.timeTo = '2015-09-29 06:31:44.000';
      timefilter.time.mode = 'absolute';

      initDashboardState();

      expect(timefilter.time.mode).to.equal('absolute');
      expect(timefilter.time.timeFrom).to.equal('2015-09-19 06:31:44.000');
      expect(timefilter.time.timeTo).to.equal('2015-09-29 06:31:44.000');
    });
  });
});
