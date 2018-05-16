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
   * @type {Array.<DashboardPanelAction>}
   */
  initialize(panelActions) {
    this.actions = panelActions;
  }
}

export const panelActionsStore = new PanelActionsStore();
