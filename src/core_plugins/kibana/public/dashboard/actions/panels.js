import { createAction } from 'redux-actions';

export const deletePanel = createAction('DELETE_PANEL');

export const updatePanel = createAction('UPDATE_PANEL');
export const resetPanelTitle = createAction('RESET_PANEl_TITLE');
export const setPanelTitle = createAction('SET_PANEl_TITLE',
  /**
   * @param title {string}
   * @param panelIndex {string}
   */
  (title, panelIndex) => ({ title, panelIndex })
);


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
