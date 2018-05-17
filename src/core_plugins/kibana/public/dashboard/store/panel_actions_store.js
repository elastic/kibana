class PanelActionsStore {
  constructor() {
    /**
     *
     * @type {Array.<DashboardPanelAction>}
     */
    this.actions = [];
  }

  /**
   *
   * @type {IndexedArray} panelActionsRegistry
   */
  initializeFromRegistry(panelActionsRegistry) {
    panelActionsRegistry.forEach(panelAction => {
      this.actions.push(panelAction);
    });
  }
}

export const panelActionsStore = new PanelActionsStore();
