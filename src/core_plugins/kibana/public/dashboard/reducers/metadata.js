import { handleActions } from 'redux-actions';
import {
  updateTitle,
  updateDescription,
  updateTags,
} from '../actions';

export const metadata = handleActions({
  [updateTitle]: (state, { payload }) => ({
    ...state,
    title: payload
  }),

  [updateDescription]: (state, { payload }) => ({
    ...state,
    description: payload
  }),

  [updateTags]: (state, { payload }) => ({
    ...state,
    tags: payload
  }),

}, {
  title: '',
  description: '',
  tags: [],
});
