import { handleActions, combineActions } from 'redux-actions';

import {
  embeddableRenderFinished,
  embeddableRenderError,
  destroyEmbeddable,
} from '../actions';

import {
  embeddable,
  getTitle,
  getEditUrl,
  getError,
} from './embeddable';

export const embeddables = handleActions({
  [destroyEmbeddable]: (state, { payload }) => {
    const stateCopy = { ...state };
    delete stateCopy[payload];
    return stateCopy;
  },

  [combineActions(embeddableRenderFinished, embeddableRenderError)]: (state, action) => ({
    ...state,
    [action.payload.panelIndex]: embeddable(state[action.payload.panelIndex], action.payload),
  }),
}, {});

export const getEmbeddable = (state, panelId) => state[panelId];
export const getEmbeddableTitle = (state, panelId) => getTitle(getEmbeddable(panelId));
export const getEmbeddableEditUrl = (state, panelId) => getEditUrl(getEmbeddable(panelId));
export const getEmbeddableError = (state, panelId) => getError(getEmbeddable(panelId));
