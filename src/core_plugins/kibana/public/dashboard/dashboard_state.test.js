import { DashboardStateManager } from './dashboard_state_manager';
import { initializeEmbeddable, setPanels } from './actions';
import { getEmbeddableFactoryMock, getAppStateMock, getSavedDashboardMock } from './__tests__';
import { store } from '../store';
import { Embeddable } from 'ui/embeddable';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.0.0' }), { virtual: true });


describe('DashboardState', function () {
  let dashboardState;
  const savedDashboard = getSavedDashboardMock();
  const timefilter = { time: {} };
  const mockQuickTimeRanges = [{ from: 'now/w', to: 'now/w', display: 'This week', section: 0 }];
  const mockIndexPattern = { id: 'index1' };

  function initDashboardState() {
    dashboardState = new DashboardStateManager({
      savedDashboard,
      AppState: getAppStateMock(),
      hideWriteControls: false,
    });
  }

  describe('syncTimefilterWithDashboard', function () {
    test('syncs quick time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      timefilter.time.from = '2015-09-19 06:31:44.000';
      timefilter.time.to = '2015-09-29 06:31:44.000';
      timefilter.time.mode = 'absolute';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(timefilter, mockQuickTimeRanges);

      expect(timefilter.time.mode).toBe('quick');
      expect(timefilter.time.to).toBe('now/w');
      expect(timefilter.time.from).toBe('now/w');
    });

    test('syncs relative time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now-13d';
      savedDashboard.timeTo = 'now';

      timefilter.time.from = '2015-09-19 06:31:44.000';
      timefilter.time.to = '2015-09-29 06:31:44.000';
      timefilter.time.mode = 'absolute';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(timefilter, mockQuickTimeRanges);

      expect(timefilter.time.mode).toBe('relative');
      expect(timefilter.time.to).toBe('now');
      expect(timefilter.time.from).toBe('now-13d');
    });

    test('syncs absolute time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
      savedDashboard.timeTo = '2015-09-29 06:31:44.000';

      timefilter.time.from = 'now/w';
      timefilter.time.to = 'now/w';
      timefilter.time.mode = 'quick';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(timefilter, mockQuickTimeRanges);

      expect(timefilter.time.mode).toBe('absolute');
      expect(timefilter.time.to).toBe(savedDashboard.timeTo);
      expect(timefilter.time.from).toBe(savedDashboard.timeFrom);
    });
  });

  describe('panelIndexPatternMapping', function () {
    beforeAll(() => {
      initDashboardState();
    });

    function simulateNewEmbeddableWithIndexPattern(id, indexPattern) {
      store.dispatch(setPanels({ [id]: { panelIndex: id } }));
      const embeddableFactory = getEmbeddableFactoryMock({
        create: () => Promise.resolve(new Embeddable({
          metadata: { title: 'my embeddable title', editUrl: 'editme', indexPattern }
        }))
      });
      store.dispatch(initializeEmbeddable({ embeddableFactory, panelId: id }));
    }

    test('initially has no index patterns', () => {
      expect(dashboardState.getPanelIndexPatterns().length).toBe(0);
    });

    test('registers index pattern when an embeddable is initialized with one', async () => {
      simulateNewEmbeddableWithIndexPattern('foo1', mockIndexPattern);
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });

    test('registers unique index patterns', async () => {
      simulateNewEmbeddableWithIndexPattern('foo2', mockIndexPattern);
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });

    test('does not register undefined index pattern for panels with no index pattern', async () => {
      simulateNewEmbeddableWithIndexPattern('foo2');
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });
  });
});
