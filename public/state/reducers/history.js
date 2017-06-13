import { handleActions } from 'redux-actions';
import { restoreHistory } from '../actions/history';

export default handleActions({
  [restoreHistory]: (persistedState, { payload }) => payload,
}, {});
