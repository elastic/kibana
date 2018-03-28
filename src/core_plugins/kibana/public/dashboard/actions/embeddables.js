import { createAction } from 'redux-actions';
import { embeddableHandlerCache } from '../cache/embeddable_handler_cache';
import _ from 'lodash';

import {
  updatePanel
} from './panels';

import {
  getPanel,
  getEmbeddablePersonalization,
} from '../../selectors/dashboard_selectors';

export const embeddableIsInitializing = createAction('EMBEDDABLE_IS_INITIALIZING');
export const embeddableInitialized = createAction('EMBEDDABLE_INITIALIZED');
export const setStagedFilter = createAction('SET_STAGED_FILTER');
export const clearStagedFilters = createAction('CLEAR_STAGED_FILTERS');
export const embeddableError = createAction('EMBEDDABLE_ERROR');

/**
 * The main point of communication from the embeddable to the dashboard. Any time state in the embeddable
 * changes, this function will be called. The data is then extracted from EmbeddableState and stored in
 * redux so the appropriate actions are taken and UI updated.
 *
 * @param {function} dispatch - redux's dispatch function
 * @param {function} getState - redux's getState function
 * @param {string} panelId - the id of the panel whose state has changed.
 * @param {EmbeddableState} embeddableState - the new state of the embeddable.
 */
function embeddableStateChanged(dispatch, getState, panelId, embeddableState) {
  // Translate embeddableState to things redux cares about.
  const personalization = getEmbeddablePersonalization(getState(), panelId);
  if (!_.isEqual(embeddableState.personalization, personalization)) {
    const panel = getPanel(getState(), panelId);
    dispatch(updatePanel({ ...panel, embeddableConfig: _.cloneDeep(embeddableState.personalization) }));
  }

  if (embeddableState.stagedFilter) {
    dispatch(setStagedFilter({ stagedFilter: embeddableState.stagedFilter, panelId }));
  }

  // TODO: communicate time range and filter changes from the embeddable through to dashboard rather than
  // through angular components.
  // const timeRange = getTimeRange(getState());
  // if (!_.isEqual(timeRange, embeddableState.timeRange)) {
  //   dispatch(updateTimeRange({ ...panel, embeddableConfig: embeddableState.personalization }));
  // }
}

/**
 * Creates the embeddable and registers it in the embeddableHandlerCache.
 * @param embeddableFactory {EmbeddableFactory}
 * @param panelId {string}
 * @return {function(*, *)}
 */
export function initializeEmbeddable({ embeddableFactory, panelId }) {
  return (dispatch, getState) => {
    const panel = getPanel(getState(), panelId);
    if (!embeddableFactory) {
      dispatch(embeddableError(panelId, new Error(`Invalid embeddable type "${panel.type}"`)));
      return;
    }

    dispatch(embeddableIsInitializing(panelId));
    embeddableFactory.create(panel, embeddableStateChanged.bind(this, dispatch, getState, panelId))
      .then((embeddable) => {
        embeddableHandlerCache.register(panel.panelIndex, embeddable);
        return dispatch(embeddableInitialized(panel.panelIndex));
      })
      .catch((error) => {
        dispatch(embeddableError({ panelId: panel.panelIndex, error: error.message }));
      });
  };
}
