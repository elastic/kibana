
/**
 * @param kbnUrl - used to change the url.
 * @return {Array<kbnTopNavConfig>} - Returns an array of objects for a top nav configuration.
 * Note that order matters and the top nav will be displayed in the same order.
 */
export function getTopNavConfig(kbnUrl) {
  return [
    getNewConfig(kbnUrl),
    getAddConfig(),
    getSaveConfig(),
    getOpenConfig(kbnUrl),
    getShareConfig(),
    getOptionsConfig()];
}

/**
 *
 * @param kbnUrl
 * @returns {kbnTopNavConfig}
 */
function getNewConfig(kbnUrl) {
  return {
    key: 'new',
    description: 'New Dashboard',
    testId: 'dashboardNewButton',
    run: () => { kbnUrl.change('/dashboard/create'); }
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
function getOpenConfig(kbnUrl) {
  return {
    key: 'open',
    description: 'Open Saved Dashboard',
    testId: 'dashboardOpenButton',
    run: () => { kbnUrl.change('/dashboard'); }
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
