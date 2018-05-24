import { handleActions, combineActions } from 'redux-actions';
import {
  updateViewMode,
  maximizePanel,
  minimizePanel,
  updateUseMargins,
  updateHidePanelTitles,
  updateIsFullScreenMode,
  updateTimeRange,
  setVisibleContextMenuPanelId,
} from '../actions';

import { DashboardViewMode } from '../dashboard_view_mode';

export const view = handleActions({
  [setVisibleContextMenuPanelId]: (state, { payload }) => ({
    ...state,
    visibleContextMenuPanelId: payload
  }),

  [updateViewMode]: (state, { payload }) => ({
    ...state,
    viewMode: payload
  }),

  [updateTimeRange]: (state, { payload }) => ({
    ...state,
    timeRange: payload
  }),

  [updateUseMargins]: (state, { payload }) => ({
    ...state,
    useMargins: payload
  }),

  [updateHidePanelTitles]: (state, { payload }) => ({
    ...state,
    hidePanelTitles: payload
  }),

  [combineActions(maximizePanel, minimizePanel)]: (state, { payload }) => ({
    ...state,
    maximizedPanelId: payload
  }),

  [updateIsFullScreenMode]: (state, { payload }) => ({
    ...state,
    isFullScreenMode: payload
  }),
}, {
  isFullScreenMode: false,
  viewMode: DashboardViewMode.VIEW,
  maximizedPanelId: undefined,
  useMargins: true,
  hidePanelTitles: false,
});
