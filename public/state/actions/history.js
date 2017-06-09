import { createAction } from 'redux-actions';
import { clear } from './resolved_args';
import { getSelectedElementId } from '../selectors/workpad';

export const setStateFromHistory = createAction('setStateFromHistory');

export const restoreHistory = ({ historyState }) => {
  return (dispatch, getState) => {
    const selectedElementId = getSelectedElementId(getState());
    dispatch(clear({ path: selectedElementId }));
    dispatch(setStateFromHistory(historyState));
  };
};
restoreHistory.toString = () => 'restoreHistory';
