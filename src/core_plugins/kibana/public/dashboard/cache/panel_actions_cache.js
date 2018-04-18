class PanelActionsCache {
  constructor() {
    this.actions = [];
  }

  initializeFromRegistry(registry) {
    this.actions = registry;
  }
}

export const panelActionsCache = new PanelActionsCache();
