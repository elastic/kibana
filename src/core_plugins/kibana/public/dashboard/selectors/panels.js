import { getPanelType as getPanelTypeFromPanel } from './panel';

export const getPanel = (state, panelId) => state[panelId];
export const getPanelType = (state, panelId) => getPanelTypeFromPanel(getPanel(state, panelId));
