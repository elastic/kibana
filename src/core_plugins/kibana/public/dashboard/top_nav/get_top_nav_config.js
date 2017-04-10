import { DashboardViewMode } from '../dashboard_view_mode';
import { TopNavIds } from './top_nav_ids';

/**
 * @param {DashboardMode} dashboardMode.
 * @param actions {Object} - A mapping of TopNavIds to an action function that should run when the
 * corresponding top nav is clicked.
 * @return {Array<kbnTopNavConfig>} - Returns an array of objects for a top nav configuration, based on the
 * mode.
 */
export function getTopNavConfig(dashboardMode, actions) {
  switch (dashboardMode) {
    case DashboardViewMode.VIEW:
      return [getShareConfig(), getEditConfig(actions[TopNavIds.ENTER_EDIT_MODE])];
    case DashboardViewMode.EDIT:
      return [
        getSaveConfig(),
        getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE]),
        getAddConfig(),
        getOptionsConfig(),
        getShareConfig()];
    default:
      return [];
  }
}

/**
 * @returns {kbnTopNavConfig}
 */
function getEditConfig(action) {
  return {
    key: 'edit',
    description: 'Switch to edit mode',
    testId: 'dashboardEditMode',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getSaveConfig() {
  return {
    key: 'save',
    description: 'Save your dashboard',
    testId: 'dashboardSaveButton',
    template: require('plugins/kibana/dashboard/top_nav/save.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(action) {
  return {
    key: 'cancel',
    description: 'Cancel editing and switch to view-only mode',
    testId: 'dashboardViewOnlyMode',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getAddConfig() {
  return {
    key: TopNavIds.ADD,
    description: 'Add a panel to the dashboard',
    testId: 'dashboardAddPanelButton',
    template: require('plugins/kibana/dashboard/top_nav/add_panel.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getShareConfig() {
  return {
    key: TopNavIds.SHARE,
    description: 'Share Dashboard',
    testId: 'dashboardShareButton',
    template: require('plugins/kibana/dashboard/top_nav/share.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getOptionsConfig() {
  return {
    key: TopNavIds.OPTIONS,
    description: 'Options',
    testId: 'dashboardOptionsButton',
    template: require('plugins/kibana/dashboard/top_nav/options.html')
  };
}
