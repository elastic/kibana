import { createAction } from 'redux-actions';

export const setLoading = createAction('setResolvedLoading');
export const setValue = createAction('setResolvedValue');
export const clear = createAction('clearResolvedValue');

export const inFlightActive = createAction('inFlightActive');
export const inFlightComplete = createAction('inFlightComplete');
