import _ from 'lodash';
import { handleActions } from 'redux-actions';

import {
  deletePanel,
  updatePanel,
  updatePanels,
} from '../actions';

import { panel, getPanelType as getPanelTypeFromPanel } from './panel';

export const panels = handleActions({
  [updatePanels]: (state, { payload }) => _.cloneDeep(payload),

  [deletePanel]: (state, { payload }) => {
    const stateCopy = { ...state };
    delete stateCopy[payload];
    return stateCopy;
  },

  [updatePanel]: (state, action) => ({
    ...state,
    [action.payload.panelIndex]: panel(state[action.payload.panelIndex], action),
  }),
}, {});

export const getPanel = (state, panelId) => state[panelId];
export const getPanelType = (state, panelId) => getPanelTypeFromPanel(getPanel(state, panelId));
