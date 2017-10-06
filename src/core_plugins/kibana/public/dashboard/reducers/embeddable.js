import { handleActions } from 'redux-actions';

import {
  embeddableRenderFinished,
  embeddableRenderError,
} from '../actions';

export const embeddable = handleActions({

  [embeddableRenderFinished]: (state, { payload }) => ({
    ...state,
    ...payload.embeddable,
    error: undefined,
  }),

  [embeddableRenderError]: (state, { payload: { error } }) => ({
    ...state,
    error,
  }),
}, {
  error: undefined,
  title: '',
  editUrl: '',
});

export const getTitle = state => state.title;
export const getEditUrl = state => state.editUrl;
export const getError = state => state.error;
