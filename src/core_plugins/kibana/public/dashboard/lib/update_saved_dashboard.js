import _ from 'lodash';
import { FilterUtils } from './filter_utils';

export function updateSavedDashboard(savedDashboard, appState, timeFilter, intervalfilter, toJson) {
  savedDashboard.title = appState.title;
  savedDashboard.description = appState.description;
  savedDashboard.timeRestore = appState.timeRestore;
  savedDashboard.panelsJSON = toJson(appState.panels);
  savedDashboard.optionsJSON = toJson(appState.options);

  savedDashboard.dateIntervalRestore = appState.dateIntervalRestore;
  savedDashboard.dateInterval = appState.dateIntervalRestore ? intervalfilter.dateInterval : undefined;

  savedDashboard.timeFrom = savedDashboard.timeRestore ?
    FilterUtils.convertTimeToString(timeFilter.time.from)
    : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore ?
    FilterUtils.convertTimeToString(timeFilter.time.to)
    : undefined;
  const timeRestoreObj = _.pick(timeFilter.refreshInterval, ['display', 'pause', 'section', 'value']);
  savedDashboard.refreshInterval = savedDashboard.timeRestore ? timeRestoreObj : undefined;
}
