import { DashboardViewMode } from '../dashboard_view_mode';

/**
 * @param {DashboardMode} dashboardMode.
 * @param kbnUrl - used to change the url.
 * @param {function} modeChange - a function to trigger a dashboard mode change.
 * @return {Array<kbnTopNavConfig>} - Returns an array of objects for a top nav configuration, based on the
 * mode.
 */
export function getTopNavConfig(dashboardMode, kbnUrl, modeChange) {
  switch (dashboardMode) {
    case DashboardViewMode.VIEW:
      return [getShareConfig(), getEditConfig(modeChange)];
    case DashboardViewMode.EDIT:
      return [getAddConfig(), getSaveConfig(), getOptionsConfig(), getViewConfig(modeChange)];
    default:
      return [];
  }
}

/**
 * @returns {kbnTopNavConfig}
 */
function getEditConfig(modeChange) {
  return {
    key: 'edit',
    description: 'Switch to edit mode',
    testId: 'dashboardEditMode',
    run: () => {
      modeChange(DashboardViewMode.EDIT);
    }
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(modeChange) {
  return {
    key: 'stop editing',
    description: 'Stop editing and switch to view only mode',
    testId: 'dashboardViewOnlyMode',
    run: () => {
      modeChange(DashboardViewMode.VIEW);
    }
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getAddConfig() {
  return {
    key: 'add',
    description: 'Add a panel to the dashboard',
    testId: 'dashboardAddPanelButton',
    template: require('plugins/kibana/dashboard/top_nav/add_panel.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getSaveConfig() {
  return {
    key: 'save',
    description: 'Save Dashboard',
    testId: 'dashboardSaveButton',
    template: require('plugins/kibana/dashboard/top_nav/save.html')
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getShareConfig() {
  return {
    key: 'share',
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
    key: 'options',
    description: 'Options',
    testId: 'dashboardOptionsButton',
    template: require('plugins/kibana/dashboard/top_nav/options.html')
  };
}
