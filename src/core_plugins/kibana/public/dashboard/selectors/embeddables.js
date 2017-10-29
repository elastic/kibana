import {
  getTitle,
  getEditUrl,
  getError,
} from './embeddable';

export const getEmbeddable = (state, panelId) => state[panelId];
export const getEmbeddableTitle = (state, panelId) => getTitle(getEmbeddable(state, panelId));
export const getEmbeddableEditUrl = (state, panelId) => getEditUrl(getEmbeddable(state, panelId));
export const getEmbeddableError = (state, panelId) => getError(getEmbeddable(state, panelId));
