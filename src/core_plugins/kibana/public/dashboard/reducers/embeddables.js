import { handleActions } from 'redux-actions';

import {
  embeddableRenderFinished,
  embeddableRenderError,
  destroyEmbeddable,
} from '../actions';

export const embeddables = handleActions({
  [destroyEmbeddable]:
    /**
     *
     * @param embeddables {Object.<string, EmbeddableState>}
     * @param payload {String} The id of the panel to delete
     * @return {Object.<string, EmbeddableState>}
     */
    (embeddables, { payload }) => {
      const embeddablesCopy = { ...embeddables };
      delete embeddablesCopy[payload];
      return embeddablesCopy;
    },

  [embeddableRenderFinished]:
    /**
     *
     * @param embeddables {Object.<string, EmbeddableState>}
     * @param payload {Object}
     * @param payload.panelId {String}
     * @param payload.embeddable {Embeddable}
     * @return {Object.<string, EmbeddableState>}
     */
    (embeddables, { payload }) => {
      return {
        ...embeddables,
        [payload.panelId]: {
          ...payload.embeddable,
          error: undefined,
        }
      };
    },

  [embeddableRenderError]:
    /**
     *
     * @param embeddables {Object.<string, EmbeddableState>}
     * @param payload {Object}
     * @param payload.panelId {String}
     * @param payload.error {String|Object}
     * @return {Object.<string, EmbeddableState>}
     */
    (embeddables, { payload }) => {
      return {
        ...embeddables,
        [payload.panelId]: {
          ...embeddables[payload.panelId],
          error: payload.error,
        }
      };
    }
}, {});
