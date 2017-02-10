import { TopNavIds } from './top_nav_ids';
/**
 * @param kbnUrl - used to change the url.
 * @return {Array<{string: function}>} - Returns an array of objects for a top nav configuration.
 * Note that order matters and the top nav will be displayed in the same order.
 */
export function getTopNavConfig(actions) {
  return [
    getAddConfig(),
    getSaveConfig(actions[TopNavIds.SAVE]),
    getCloneConfig(actions[TopNavIds.CLONE]),
    getRenameConfig(),
    getShareConfig(),
    getOptionsConfig()];
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
function getSaveConfig(action) {
  return {
    key: TopNavIds.SAVE,
    description: 'Save Dashboard',
    testId: 'dashboardSaveButton',
    run: action
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
