import { ContainerAPI } from 'ui/embeddable';

export class DashboardContainerAPI extends ContainerAPI {
  constructor(dashboardState, queryManager) {
    super();
    this.dashboardState = dashboardState;
    this.queryManager = queryManager;
  }

  onFilter(field, value, operator, index) {
    this.queryManager.add(field, value, operator, index);
  }

  updatePanel(panelIndex, panelAttributes) {
    const panelToUpdate = this.dashboardState.getPanels().find((panel) => panel.panelIndex === panelIndex);
    Object.assign(panelToUpdate, panelAttributes);
    this.dashboardState.saveState();
    return panelToUpdate;
  }

  getAppState() {
    return this.dashboardState.appState;
  }

  getIsViewOnlyMode() {
    return this.dashboardState.getIsViewMode();
  }

  createChildUiState(path, uiState) {
    return this.dashboardState.uiState.createChild(path, uiState, true);
  }

  registerPanelIndexPattern(panelIndex, pattern) {
    this.dashboardState.registerPanelIndexPatternMap(panelIndex, pattern);
    this.dashboardState.saveState();
  }

}
