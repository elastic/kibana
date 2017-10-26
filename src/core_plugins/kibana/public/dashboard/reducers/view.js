import { handleActions, combineActions } from 'redux-actions';
import { updateViewMode, maximizePanel, minimizePanel, updateIsFullScreenMode } from '../actions';
import { DashboardViewMode } from '../dashboard_view_mode';

export const view = handleActions({
  [updateViewMode]: (state, { payload }) => ({
    ...state,
    viewMode: payload
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
  maximizedPanelId: undefined
});


export const getViewMode = state => state.viewMode;
export const getFullScreenMode = state => state.isFullScreenMode;
export const getMaximizedPanelId = state => state.maximizedPanelId;
