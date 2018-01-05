import { store } from '../../store';
import {
  updateIsFullScreenMode,
  updateViewMode,
  maximizePanel,
  minimizePanel,
} from '../actions';

import {
  getFullScreenMode,
  getViewMode,
  getMaximizedPanelId,
} from '../../selectors';

import { DashboardViewMode } from '../dashboard_view_mode';

describe('isFullScreenMode', () => {
  test('updates to true', () => {
    store.dispatch(updateIsFullScreenMode(true));
    const fullScreenMode = getFullScreenMode(store.getState());
    expect(fullScreenMode).toBe(true);
  });

  test('updates to false', () => {
    store.dispatch(updateIsFullScreenMode(false));
    const fullScreenMode = getFullScreenMode(store.getState());
    expect(fullScreenMode).toBe(false);
  });
});

describe('viewMode', () => {
  test('updates to EDIT', () => {
    store.dispatch(updateViewMode(DashboardViewMode.EDIT));
    const viewMode = getViewMode(store.getState());
    expect(viewMode).toBe(DashboardViewMode.EDIT);
  });

  test('updates to VIEW', () => {
    store.dispatch(updateViewMode(DashboardViewMode.VIEW));
    const viewMode = getViewMode(store.getState());
    expect(viewMode).toBe(DashboardViewMode.VIEW);
  });
});

describe('maximizedPanelId', () => {
  test('updates to an id when maximized', () => {
    store.dispatch(maximizePanel('1'));
    const maximizedId = getMaximizedPanelId(store.getState());
    expect(maximizedId).toBe('1');
  });

  test('updates to an id when minimized', () => {
    store.dispatch(minimizePanel());
    const maximizedId = getMaximizedPanelId(store.getState());
    expect(maximizedId).toBe(undefined);
  });
});
