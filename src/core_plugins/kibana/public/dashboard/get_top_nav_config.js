import { createTopNavExecuteConfig, createTopNavTemplateConfig } from 'ui/kbn_top_nav/kbn_top_nav_config';

/**
 * @param kbnUrl - used to change the url.
 * @return {Array} - Returns an array of objects for a top nav configuration, based on the
 * mode.
 */
export function getTopNavConfig(kbnUrl) {
  return [
    getNewConfig(kbnUrl),
    getAddConfig(),
    getSaveConfig(),
    getOpenConfig(),
    getShareConfig(),
    getOptionsConfig()];
}

function getNewConfig(kbnUrl) {
  return createTopNavExecuteConfig(
    'new',
    'New Dashboard',
    'dashboardNewButton',
    () => { kbnUrl.change('/dashboard', {}); });
}

function getAddConfig() {
  return createTopNavTemplateConfig(
    'add',
    'Add a panel to the dashboard',
    'dashboardAddPanelButton',
    require('plugins/kibana/dashboard/partials/pick_visualization.html'));
}

function getSaveConfig() {
  return createTopNavTemplateConfig(
    'save',
    'Save Dashboard',
    'dashboardSaveButton',
    require('plugins/kibana/dashboard/partials/save_dashboard.html'));
}

function getOpenConfig() {
  return createTopNavTemplateConfig(
    'open',
    'Open Saved Dashboard',
    'dashboardOpenButton',
    require('plugins/kibana/dashboard/partials/load_dashboard.html'));
}

function getShareConfig() {
  return createTopNavTemplateConfig(
    'share',
    'Share Dashboard',
    'dashboardShareButton',
    require('plugins/kibana/dashboard/partials/share.html'));
}

function getOptionsConfig() {
  return createTopNavTemplateConfig(
    'options',
    'Options',
    'dashboardOptionsButton',
     require('plugins/kibana/dashboard/partials/options.html'));
}
