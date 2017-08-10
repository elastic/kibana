import { ContainerAPI } from 'ui/embeddable';

export class DashboardContainerAPI extends ContainerAPI {
  constructor(dashboardState, queryManager) {
    super();
    this.dashboardState = dashboardState;
    this.queryManager = queryManager;
  }

  addFilter(field, value, operator, index) {
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

  createChildUistate(path, initialState) {
    return this.dashboardState.uiState.createChild(path, initialState, true);
  }

  registerPanelIndexPattern(panelIndex, pattern) {
    this.dashboardState.registerPanelIndexPatternMap(panelIndex, pattern);
    this.dashboardState.saveState();
  }

}
