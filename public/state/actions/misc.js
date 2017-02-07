import { createAction } from 'redux-actions';

export const dropdownToggle = createAction('DROPDOWN_TOGGLE');
export const dropdownOpen = createAction('DROPDOWN_OPEN');
export const dropdownClose = createAction('DROPDOWN_CLOSE');

export const fullscreenToggle = createAction('FULLSCREEN_TOGGLE');

window.fullscreenToggle = fullscreenToggle;
