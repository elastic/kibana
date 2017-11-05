import _ from 'lodash';
import { handleActions } from 'redux-actions';

import {
  deletePanel,
  updatePanel,
  updatePanels,
} from '../actions';

import { panel } from './panel';

export const panels = handleActions({
  [updatePanels]: (state, { payload }) => {
    const stateCopy = { ...state };
    Object.values(payload).forEach(updatedPanel => {
      stateCopy[updatedPanel.panelIndex] = _.defaultsDeep(updatedPanel, stateCopy[updatedPanel.panelIndex]);
    });
    return stateCopy;
  },
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
