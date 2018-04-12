import { createAction } from 'redux-actions';
import _ from 'lodash';

import {
  updatePanel
} from './panels';

import {
  getPanel,
  getEmbeddableCustomization,
} from '../../selectors/dashboard_selectors';

export const embeddableIsInitializing = createAction('EMBEDDABLE_IS_INITIALIZING');
export const embeddableIsInitialized = createAction('EMBEDDABLE_INITIALIZED');
export const setStagedFilter = createAction('SET_STAGED_FILTER');
export const clearStagedFilters = createAction('CLEAR_STAGED_FILTERS');
export const embeddableError = createAction('EMBEDDABLE_ERROR');

/**
 * The main point of communication from the embeddable to the dashboard. Any time state in the embeddable
 * changes, this function will be called. The data is then extracted from EmbeddableState and stored in
 * redux so the appropriate actions are taken and UI updated.

 * @param {string} panelId - the id of the panel whose state has changed.
 * @param {EmbeddableState} embeddableState - the new state of the embeddable.
 */
export function embeddableStateChanged({ panelId, embeddableState }) {
  return (dispatch, getState) => {
    // Translate embeddableState to things redux cares about.
    const customization = getEmbeddableCustomization(getState(), panelId);
    if (!_.isEqual(embeddableState.customization, customization)) {
      const panel = getPanel(getState(), panelId);
      dispatch(updatePanel({ ...panel, embeddableConfig: _.cloneDeep(embeddableState.customization) }));
    }

    if (embeddableState.stagedFilter) {
      dispatch(setStagedFilter({ stagedFilter: embeddableState.stagedFilter, panelId }));
    }
  };
}

