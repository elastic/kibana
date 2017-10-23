import { createAction } from 'redux-actions';

export const deletePanel = createAction('DELETE_PANEL');

export const updatePanel = createAction('UPDATE_PANEL');

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const updatePanels = createAction('UPDATE_PANELS', panels => {
  const panelsMap = {};
  panels.forEach(panel => {
    panelsMap[panel.panelIndex] = panel;
  });
  return panelsMap;
});
