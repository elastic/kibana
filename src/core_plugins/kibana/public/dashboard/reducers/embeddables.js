import { handleActions, combineActions } from 'redux-actions';

import {
  embeddableRenderFinished,
  embeddableRenderError,
  destroyEmbeddable,
} from '../actions';

import {
  embeddable,
} from './embeddable';

export const embeddables = handleActions({
  [destroyEmbeddable]: (state, { payload }) => {
    const stateCopy = { ...state };
    delete stateCopy[payload];
    return stateCopy;
  },

  [combineActions(embeddableRenderFinished, embeddableRenderError)]: (state, action) => ({
    ...state,
    [action.payload.panelId]: embeddable(state[action.payload.panelId], action),
  }),
}, {});
