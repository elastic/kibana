import { handleActions } from 'redux-actions';
import { restoreHistory } from '../actions/history';

export const historyReducer = handleActions(
  {
    [restoreHistory]: (persistedState, { payload }) => payload,
  },
  {}
);
