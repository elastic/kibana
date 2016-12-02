export const DEFAULT_PANEL_WIDTH = 3;
export const DEFAULT_PANEL_HEIGHT = 2;

/**
 * Represents a panel on a grid. Keeps track of position in the grid and what visualization it
 * contains.
 *
 * @param id - Id of the visualization contained in the panel.
 * @param type - Type of the visualization in the panel.
 * @param panelId - Unique id to represent this panel in the grid.
 * @constructor
 */
function Panel(id, type, panelId) {
  /**
   * A reference to the gridster widget holding this panel. Used to
   * update the size and column attributes.
   */
  this.$el;

  /**
   * Width of the panel.
   * @type {number}
   */
  this.size_x = DEFAULT_PANEL_WIDTH;

  /**
   * Height of the panel.
   * @type {number}
   */
  this.size_y = DEFAULT_PANEL_HEIGHT;

  /**
   * Column index in the grid.
   * @type {number}
   */
  this.col;

  /**
   * Row index of the panel in the grid.
   * @type {number}
   */
  this.row;

  /**
   * Height of the panel.
   * @type {number}
   */
  this.id = id;

  /**
   * Unique identifier for this panel. Guaranteed to be unique among the current
   * panels in the grid.
   * @type {number}
   */
  this.panelId = panelId;

  /**
   * Type of visualization this panel contains.
   * @type {string}
   */
  this.type = type;
}


export class PanelFactory {
  /**
   * Factory function to create a panel object.
   *
   * @param id {string} - The id of the visualization this panel contains
   * @param type {string} - The type of visualization this panel contains
   * @param panelId {number} - A unique identifier for this panel in the grid
   * @returns {Panel}
   */
   static create(id, type, panelId) {
     return new Panel(id, type, panelId);
   }
}
