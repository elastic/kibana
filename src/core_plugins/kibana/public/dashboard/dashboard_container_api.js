import { ContainerAPI } from 'ui/embeddable';

export class DashboardContainerAPI extends ContainerAPI {
  constructor(dashboardState, addFilter) {
    super();
    this.dashboardState = dashboardState;
    this.addFilter = addFilter;
  }

  updatePanel(panelIndex, panelAttributes) {
    return this.dashboardState.updatePanel(panelIndex, panelAttributes);
  }

  getAppState() {
    return this.dashboardState.appState;
  }

  registerPanelIndexPattern(panelIndex, pattern) {
    this.dashboardState.registerPanelIndexPatternMap(panelIndex, pattern);
    this.dashboardState.saveState();
  }

  getHidePanelTitles() {
    return this.dashboardState.getHidePanelTitles();
  }
}
