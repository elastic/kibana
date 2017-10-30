import { getPanelType as getPanelTypeFromPanel } from './panel';

/**
 * @typedef {Object.<string, PanelState>} PanelsState
 */

/**
 * @param panels {PanelsState}
 * @param panelId {string}
 * @return {PanelState}
 */
export const getPanel = (panels, panelId) => panels[panelId];

/**
 * @param panels {PanelsState}
 * @param panelId {string}
 * @return {string}
 */
export const getPanelType = (panels, panelId) => getPanelTypeFromPanel(getPanel(panels, panelId));
