import { createAction } from 'redux-actions';

export const updateViewMode = createAction('UPDATE_VIEW_MODE', viewMode => viewMode);
export const maximizePanel = createAction('MAXIMIZE_PANEl', maximizedPanelId => maximizedPanelId);
export const minimizePanel = createAction('MINIMIZE_PANEL', () => {});
export const updateIsFullScreenMode = createAction('UPDATE_IS_FULL_SCREEN_MODE', isFullScreenMode => isFullScreenMode);
