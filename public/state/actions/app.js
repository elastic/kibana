import { createAction } from 'redux-actions';
import { getEditing } from '../selectors/app';

export const setEditing = createAction('setEditing');
export const toggleEditing = () => (dispatch, getState) => {
  const editing = getEditing(getState());
  dispatch(setEditing(!editing));
};
