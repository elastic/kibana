import { handleActions } from 'redux-actions';
import _ from 'lodash';

import {
  embeddableIsInitializing,
  embeddableError,
  embeddableIsInitialized,
  setStagedFilter,
  clearStagedFilters,
  deletePanel,
} from '../actions';

export const embeddables = handleActions({
  [clearStagedFilters]:
    (embeddables) => {
      return _.mapValues(embeddables, (embeddable) => _.omit({ ...embeddable }, ['stagedFilters']));
    },

  [embeddableIsInitialized]:
  /**
   *
   * @param embeddables {Object.<string, EmbeddableState>}
   * @param payload {Object}
   * @param payload.panelId {string} Panel id of embeddable that was initialized
   * @param payload.metadata {object} Metadata for the embeddable that was initialized
   * @return {Object.<string, EmbeddableState>}
   */
    (embeddables, { payload }) => {
      return {
        ...embeddables,
        [payload.panelId]: {
          ...embeddables[payload.panelId],
          initialized: true,
          metadata: { ...payload.metadata },
        }
      };
    },

  // TODO: Currently only saved search uses this to apply a filter. When visualize uses it too, we will need to
  // support multiple staged filters.
  [setStagedFilter]:
    (embeddables, { payload }) => {
      return {
        ...embeddables,
        [payload.panelId]: {
          ...embeddables[payload.panelId],
          stagedFilter: payload.stagedFilter,
        }
      };
    },

  [deletePanel]:
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

  [embeddableIsInitializing]:
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
        [payload]: {
          initialized: false,
          error: undefined,
        }
      };
    },

  [embeddableError]:
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
