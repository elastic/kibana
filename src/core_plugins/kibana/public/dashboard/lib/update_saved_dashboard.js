import { convertTimeToString } from './convert_time_to_string';

export function updateSavedDashboard(savedDashboard, appState, uiState, timeFilter, toJson) {
  savedDashboard.title = appState.title;
  savedDashboard.description = appState.description;
  savedDashboard.timeRestore = appState.timeRestore;
  savedDashboard.panelsJSON = toJson(appState.panels);
  savedDashboard.uiStateJSON = toJson(uiState.getChanges());
  savedDashboard.optionsJSON = toJson(appState.options);

  savedDashboard.timeFrom = savedDashboard.timeRestore ? convertTimeToString(timeFilter.time.from) : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore ? convertTimeToString(timeFilter.time.to) : undefined;
  const timeRestoreObj = _.pick(timeFilter.refreshInterval, ['display', 'pause', 'section', 'value']);
  savedDashboard.refreshInterval = savedDashboard.timeRestore ? timeRestoreObj : undefined;
}
