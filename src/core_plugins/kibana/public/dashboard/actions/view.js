import { createAction } from 'redux-actions';

export const updateViewMode = createAction('UPDATE_VIEW_MODE');
export const maximizePanel = createAction('MAXIMIZE_PANEl');
export const minimizePanel = createAction('MINIMIZE_PANEL');
export const updateIsFullScreenMode = createAction('UPDATE_IS_FULL_SCREEN_MODE');
export const updateUseMargins = createAction('UPDATE_USE_MARGINS');
export const updateHidePanelTitles = createAction('HIDE_PANEL_TITLES');
