import { DashboardViewMode } from '../dashboard_view_mode';
import { FilterUtils } from './filter_utils';

export function getAppStateDefaults(savedDashboard, hideWriteControls) {
  return {
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
}
