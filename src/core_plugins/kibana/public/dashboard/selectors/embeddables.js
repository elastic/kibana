import {
  getTitle,
  getEditUrl,
  getError,
} from './embeddable';

/**
 * @typedef {Object.<string, EmbeddableState>} EmbeddablesState
 */

/**
 * @param embeddables {EmbeddablesState}
 * @param panelId {string}
 * @return {Embeddable}
 */
export const getEmbeddable = (embeddables, panelId) => embeddables[panelId];
/**
 * @param embeddables {EmbeddablesState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableTitle = (embeddables, panelId) => getTitle(getEmbeddable(embeddables, panelId));
/**
 * @param embeddables {EmbeddablesState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableEditUrl = (embeddables, panelId) => getEditUrl(getEmbeddable(embeddables, panelId));
/**
 * @param embeddables {EmbeddablesState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableError = (embeddables, panelId) => getError(getEmbeddable(embeddables, panelId));
