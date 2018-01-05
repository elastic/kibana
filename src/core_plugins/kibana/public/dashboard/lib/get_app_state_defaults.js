import { DashboardViewMode } from '../dashboard_view_mode';
import { FilterUtils } from './filter_utils';

export function getAppStateDefaults(savedDashboard, hideWriteControls) {
  const appState = {
    fullScreenMode: false,
    title: savedDashboard.title,
    description: savedDashboard.description,
    timeRestore: savedDashboard.timeRestore,
    panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
    options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    query: FilterUtils.getQueryFilterForDashboard(savedDashboard),
    filters: FilterUtils.getFilterBarsForDashboard(savedDashboard),
    viewMode: savedDashboard.id || hideWriteControls ? DashboardViewMode.VIEW : DashboardViewMode.EDIT,
  };

  // For BWC in pre 6.1 versions where uiState was stored at the dashboard level, not at the panel level.
  if (savedDashboard.uiStateJSON) {
    const uiState = JSON.parse(savedDashboard.uiStateJSON);
    appState.panels.forEach(panel => {
      panel.embeddableConfig = uiState[`P-${panel.panelIndex}`];
    });
    delete savedDashboard.uiStateJSON;
  }
  return appState;
}
