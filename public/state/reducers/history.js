import { handleActions } from 'redux-actions';
import { setStateFromHistory } from '../actions/history';

export default handleActions({
  [setStateFromHistory]: (persistedState, { payload }) => payload,
}, {});
