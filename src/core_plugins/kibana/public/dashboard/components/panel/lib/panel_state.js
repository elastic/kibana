export const DEFAULT_PANEL_WIDTH = 3;
export const DEFAULT_PANEL_HEIGHT = 2;

/**
 * Represents a panel on a grid. Keeps track of position in the grid and what visualization it
 * contains.
 *
 * @typedef {Object} PanelState
 * @property {number} id - Id of the visualization contained in the panel.
 * @property {Element} $el - A reference to the gridster widget holding this panel. Used to
 * update the size and column attributes. TODO: move out of panel state as this couples state to ui.
 * @property {string} type - Type of the visualization in the panel.
 * @property {number} panelId - Unique id to represent this panel in the grid.
 * @property {number} size_x - Width of the panel.
 * @property {number} size_y - Height of the panel.
 * @property {number} col - Column index in the grid.
 * @property {number} row - Row index in the grid.
 */

/**
 * Creates and initializes a basic panel state.
 * @param {number} id
 * @param {string} type
 * @param {number} panelId
 * @return {PanelState}
 */
export function createPanelState(id, type, panelId) {
  return {
    size_x: DEFAULT_PANEL_WIDTH,
    size_y: DEFAULT_PANEL_HEIGHT,
    panelId: panelId,
    type: type,
    id: id
  };
}
