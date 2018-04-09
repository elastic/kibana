/**
 * The ContainerAPI is an interface for embeddable objects to interact with the container they are embedded within.
 */
export class ContainerAPI {
  /**
   * Available so the embeddable object can trigger a filter action.
   * @param field
   * @param value
   * @param operator
   * @param index
   */
  addFilter(/*field, value, operator, index */) {
    throw new Error('Must implement addFilter.');
  }

  /**
   * Call this to tell the container that this panel uses a particular index pattern.
   * @param {string} panelIndex - a unique id that identifies the panel to update.
   * @param {string} indexPattern - an index pattern the panel uses
   */
  registerPanelIndexPattern(/* panelIndex, indexPattern */) {
    throw new Error('Must implement registerPanelIndexPattern.');
  }

  /**
   * @param {string} panelIndex - a unique id that identifies the panel to update.
   * @param {Object} panelAttributes - the new panel attributes that will be applied to the panel.
   * @return {Object} - the updated panel.
   */
  updatePanel(/*paneIndex, panelAttributes */) {
    throw new Error('Must implement updatePanel.');
  }

  getHidePanelTitles() {
    return this.dashboardState.getHidePanelTitles();
  }
}
