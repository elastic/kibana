import _ from 'lodash';
import { handleActions } from 'redux-actions';

import {
  deletePanel,
  updatePanel,
  updatePanels,
  setPanels,
} from '../actions';

export const panels = handleActions({
  [setPanels]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {Object.<string, PanelState>}
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => _.cloneDeep(payload),

  [updatePanels]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {Object.<string, PanelState>}
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => {
      const panelsCopy = { ...panels };
      Object.values(payload).forEach(updatedPanel => {
        panelsCopy[updatedPanel.panelIndex] = _.defaultsDeep(updatedPanel, panelsCopy[updatedPanel.panelIndex]);
      });
      return panelsCopy;
    },

  [deletePanel]:
    /**
     *
     * @param panels {Object.<string, PanelState>}
     * @param payload {string} The panelIndex of the panel to delete
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => {
      const panelsCopy = { ...panels };
      delete panelsCopy[payload];
      return panelsCopy;
    },

  [updatePanel]:
    /**
     * @param panels {Object.<string, PanelState>}
     * @param payload {PanelState} The new panel state (is merged with existing).
     * @param payload.panelIndex {string} The id of the panel to update.
     * @return {Object.<string, PanelState>}
     */
    (panels, { payload }) => ({
      ...panels,
      [payload.panelIndex]: _.defaultsDeep(payload, panels[[payload.panelIndex]]),
    }),
}, {});
