import { handleActions } from 'redux-actions';
import { updateTitle, updateDescription } from '../actions';

export const metadata = handleActions({
  [updateTitle]: (state, { payload }) => ({
    ...state,
    title: payload
  }),

  [updateDescription]: (state, { payload }) => ({
    ...state,
    description: payload
  }),

}, {
  title: '',
  description: '',
});
