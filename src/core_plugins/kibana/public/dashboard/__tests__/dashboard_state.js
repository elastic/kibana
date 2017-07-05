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
  const mockIndexPattern = { id: 'index1' };

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

  describe('panelIndexPatternMapping', function () {
    it('registers index pattern', function () {
      const state = new DashboardState(savedDashboard, AppState);
      state.registerPanelIndexPatternMap('panel1', mockIndexPattern);
      expect(state.getPanelIndexPatterns().length).to.equal(1);
    });

    it('registers unique index patterns', function () {
      const state = new DashboardState(savedDashboard, AppState);
      state.registerPanelIndexPatternMap('panel1', mockIndexPattern);
      state.registerPanelIndexPatternMap('panel2', mockIndexPattern);
      expect(state.getPanelIndexPatterns().length).to.equal(1);
    });

    it('does not register undefined index pattern for panels with no index pattern', function () {
      const state = new DashboardState(savedDashboard, AppState);
      state.registerPanelIndexPatternMap('markdownPanel1', undefined);
      expect(state.getPanelIndexPatterns().length).to.equal(0);
    });
  });
});
