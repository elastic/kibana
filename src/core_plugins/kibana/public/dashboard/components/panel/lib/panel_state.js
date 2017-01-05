export const DEFAULT_PANEL_WIDTH = 6;
export const DEFAULT_PANEL_HEIGHT = 3;

/**
 * Represents a panel on a grid. Keeps track of position in the grid and what visualization it
 * contains.
 *
 * @typedef {Object} PanelState
 * @property {number} id - Id of the visualization contained in the panel.
 * @property {Element} $el - A reference to the gridster widget holding this panel. Used to
 * update the size and column attributes. TODO: move out of panel state as this couples state to ui.
 * @property {string} type - Type of the visualization in the panel.
 * @property {number} panelIndex - Unique id to represent this panel in the grid. Note that this is
 * NOT the index in the panels array. While it may initially represent that, it is not
 * updated with changes in a dashboard, and is simply used as a unique identifier.  The name
 * remains as panelIndex for backward compatibility reasons - changing it can break reporting.
 * @property {number} size_x - Width of the panel.
 * @property {number} size_y - Height of the panel.
 * @property {number} col - Column index in the grid.
 * @property {number} row - Row index in the grid.
 */

/**
 * Creates and initializes a basic panel state.
 * @param {number} id
 * @param {string} type
 * @param {number} panelIndex
 * @return {PanelState}
 */
export function createPanelState(id, type, panelIndex) {
  return {
    size_x: DEFAULT_PANEL_WIDTH,
    size_y: DEFAULT_PANEL_HEIGHT,
    panelIndex: panelIndex,
    type: type,
    id: id
  };
}

/**
 * Returns a unique id for storing the panel state in the persistent ui.
 * @param {PanelState} panel
 * @returns {string}
 */
export function getPersistedStateId(panel) {
  return `P-${panel.panelIndex}`;
}
