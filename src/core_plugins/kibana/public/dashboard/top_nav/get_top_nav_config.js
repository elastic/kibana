import { DashboardViewMode } from '../dashboard_view_mode';
import { TopNavIds } from './top_nav_ids';

/**
 * @param {DashboardMode} dashboardMode.
 * @param kbnUrl - used to change the url.
<<<<<<< HEAD
 * @param {function} modeChange - a function to trigger a dashboard mode change.
 * @return {Array<kbnTopNavConfig>} - Returns an array of objects for a top nav configuration, based on the
 * mode.
 */
export function getTopNavConfig(dashboardMode, actions) {
  switch (dashboardMode) {
    case DashboardViewMode.VIEW:
      return [getShareConfig(), getEditConfig(actions[TopNavIds.ENTER_EDIT_MODE])];
    case DashboardViewMode.EDIT:
      return [
        getAddConfig(),
        getRenameConfig(),
        getCloneConfig(actions[TopNavIds.CLONE]),
        getOptionsConfig(),
        getSaveConfig(actions[TopNavIds.SAVE]),
        getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE])];
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
function getSaveConfig(action) {
  return {
    key: 'save',
    description: 'Save your dashboard',
    testId: 'dashboardSaveButton',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(action) {
  return {
    key: 'cancel',
    description: 'Cancel editing and switch to view only mode',
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
function getRenameConfig() {
  return {
    key: TopNavIds.RENAME,
    description: 'Rename Dashboard',
    testId: 'dashboardRenameButton',
    template: require('plugins/kibana/dashboard/top_nav/rename.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getCloneConfig(action) {
  return {
    key: TopNavIds.CLONE,
    description: 'Clone Dashboard',
    testId: 'dashboardCloneButton',
    run: action
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
