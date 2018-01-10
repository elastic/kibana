import { handleActions } from 'redux-actions';
import { appReady, appError } from '../actions/app';

export const appReducer = handleActions(
  {
    [appReady]: appState => ({ ...appState, ready: true }),
    [appError]: (appState, { payload }) => ({ ...appState, ready: payload }),
  },
  {}
);
