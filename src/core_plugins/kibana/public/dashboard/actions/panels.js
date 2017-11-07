import { createAction } from 'redux-actions';

export const deletePanel = createAction('DELETE_PANEL');

export const updatePanel = createAction('UPDATE_PANEL');

function panelArrayToMap(panels) {
  const panelsMap = {};
  panels.forEach(panel => {
    panelsMap[panel.panelIndex] = panel;
  });
  return panelsMap;
}

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const updatePanels = createAction('UPDATE_PANELS', panels => panelArrayToMap(panels));

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const setPanels = createAction('SET_PANELS', panels => panelArrayToMap(panels));
