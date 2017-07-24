import { createAction } from 'redux-actions';

// actions to set the application state
export const appReady = createAction('appReady');
export const appError = createAction('appError');
