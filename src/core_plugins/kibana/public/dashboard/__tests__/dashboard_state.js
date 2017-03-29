import ngMock from 'ng_mock';
import expect from 'expect.js';

import { DashboardState } from '../dashboard_state';

describe('DashboardState', function () {
  let AppState;
  let dashboardState;
  let savedDashboard;
  let SavedDashboard;
  let timefilter;
  let quickTimeRanges;

  function initDashboardState() {
    dashboardState = new DashboardState(savedDashboard, AppState);
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    timefilter = $injector.get('timefilter');
    quickTimeRanges = $injector.get('quickRanges');
    AppState = $injector.get('AppState');
    SavedDashboard = $injector.get('SavedDashboard');
    savedDashboard = new SavedDashboard();
  }));

  describe('syncTimefilterWithDashboard', function () {
    it('syncs quick time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      timefilter.time.from = '2015-09-19 06:31:44.000';
      timefilter.time.to = '2015-09-29 06:31:44.000';
      timefilter.time.mode = 'absolute';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(timefilter, quickTimeRanges);

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
      dashboardState.syncTimefilterWithDashboard(timefilter, quickTimeRanges);

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
      dashboardState.syncTimefilterWithDashboard(timefilter, quickTimeRanges);

      expect(timefilter.time.mode).to.equal('absolute');
      expect(timefilter.time.to).to.equal(savedDashboard.timeTo);
      expect(timefilter.time.from).to.equal(savedDashboard.timeFrom);
    });
  });
});
