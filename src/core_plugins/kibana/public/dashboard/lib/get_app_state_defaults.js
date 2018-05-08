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
  // TODO: introduce a migration for this
  if (savedDashboard.uiStateJSON) {
    const uiState = JSON.parse(savedDashboard.uiStateJSON);
    appState.panels.forEach(panel => {
      panel.embeddableConfig = uiState[`P-${panel.panelIndex}`];
    });
    delete savedDashboard.uiStateJSON;
  }

  // For BWC of pre 6.4 where search embeddables stored state directly on the panel and not under embeddableConfig.
  // TODO: introduce a migration for this
  appState.panels.forEach(panel => {
    if (panel.columns || panel.sort) {
      panel.embeddableConfig = {
        ...panel.embeddableConfig,
        columns: panel.columns,
        sort: panel.sort
      };
      delete panel.columns;
      delete panel.sort;
    }
  });


  return appState;
}
