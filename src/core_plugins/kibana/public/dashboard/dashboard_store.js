import { DashboardViewMode } from './dashboard_view_mode';

/**
 * Redux state tree for the Dashboard App.
 *
 * @typedef {Object} DashboardState
 * @property {Object.<string, PanelState>} panels - a mapping of panel id (aka panelIndex) to PanelState
 * @property {Object.<string, Embeddable>} embeddables - a mapping of panel id to the embeddable object returned
 * from a EmbeddableHandler.render call.
 * @property {boolean} isFullScreenMode - true if the user is in full screen mode, false otherwise
 * @property {DashboardViewMode} viewMode - Whether the user is in view or edit mode
 * @property {string} maximizedPanelId - the panel id of the maximized panel, or undefined if no panel is maximized.
 */

/**
 * @return {DashboardState}
 */
export function getInitialState() {
  return {
    panels: {}, // Mapping of panel ids to panel state
    isFullScreenMode: false,
    viewMode: DashboardViewMode.VIEW,
    maximizedPanelId: undefined
  };
}
