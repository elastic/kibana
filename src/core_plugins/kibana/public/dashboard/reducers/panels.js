import _ from 'lodash';
import { handleActions } from 'redux-actions';

import {
  deletePanel,
  updatePanel,
  updatePanels,
  embeddableRenderFinished,
  embeddableRenderError
} from '../actions';

export const panels = handleActions({
  [deletePanel]: (state, { payload }) => {
    const stateCopy = { ...state };
    delete stateCopy[payload];
    return stateCopy;
  },

  [updatePanel]: (state, { payload }) => ({
    ...state,
    [payload.panelIndex]: _.defaultsDeep(payload, state[payload.panelIndex])
  }),

  [updatePanels]: (state, { payload }) => ({
    ..._.cloneDeep(payload)
  }),

  [embeddableRenderFinished]: (state, { payload }) => ({
    ...state,
    [payload.panelId]: {
      ...state[payload.panelId],
      renderError: null,
      embeddable: payload.embeddable,
    }
  }),

  [embeddableRenderError]: (state, { payload: { panelId, error } }) => ({
    ...state,
    [panelId]: {
      ...state[panelId],
      renderError: error
    }
  })
}, {});
