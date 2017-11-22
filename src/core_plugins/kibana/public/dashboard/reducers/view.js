import { handleActions, combineActions } from 'redux-actions';
import {
  updateViewMode,
  maximizePanel,
  minimizePanel,
  updateUseMargins,
  updateHidePanelTitles,
  updateIsFullScreenMode,
} from '../actions';

import { DashboardViewMode } from '../dashboard_view_mode';

export const view = handleActions({
  [updateViewMode]: (state, { payload }) => ({
    ...state,
    viewMode: payload
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
