import { createAction } from 'redux-actions';

export const dropdownToggle = createAction('DROPDOWN_TOGGLE');
export const fullscreenToggle = createAction('FULLSCREEN_TOGGLE');

window.fullscreenToggle = fullscreenToggle;
