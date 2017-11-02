import { DashboardViewMode } from '../dashboard_view_mode';
import { FilterUtils } from './filter_utils';

export function getAppStateDefaults(savedDashboard, hideWriteControls) {
  const defaults = {
    fullScreenMode: false,
    title: savedDashboard.title,
    description: savedDashboard.description,
    timeRestore: savedDashboard.timeRestore,
    panels: savedDashboard.panelsJSON ? JSON.parse(savedDashboard.panelsJSON) : [],
    options: savedDashboard.optionsJSON ? JSON.parse(savedDashboard.optionsJSON) : {},
    uiState: savedDashboard.uiStateJSON ? JSON.parse(savedDashboard.uiStateJSON) : {},
    query: FilterUtils.getQueryFilterForDashboard(savedDashboard),
    filters: FilterUtils.getFilterBarsForDashboard(savedDashboard),
    viewMode: savedDashboard.id || hideWriteControls ? DashboardViewMode.VIEW : DashboardViewMode.EDIT,
  };

  // Need a better way to create dashboard defaults for JSON portions that may not exist in older dashboards.
  // New dashboards will default to useMargins = true, but for BWC, we want old dashboards that don't know about
  // this setting to set it to false.
  if (defaults.options.useMargins === undefined) {
    defaults.options.useMargins = false;
  }
  return defaults;
}
