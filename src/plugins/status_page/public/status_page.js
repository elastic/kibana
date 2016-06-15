import _ from 'lodash';
import notify from 'ui/notify';
import $ from 'jquery';
import 'ui/autoload/styles';
import 'plugins/status_page/status_page_metric';
import 'plugins/status_page/status_page.less';
import uiModules from 'ui/modules';


const chrome = require('ui/chrome')
.setRootTemplate(require('plugins/status_page/status_page.html'))
.setRootController('ui', function ($http, $scope) {
  const ui = this;
  ui.loading = false;

  ui.refresh = function () {
    ui.loading = true;

    // go ahead and get the info you want
    return $http
    .get(chrome.addBasePath('/api/status'))
    .then(function (resp) {

      if (ui.fetchError) {
        ui.fetchError.clear();
        ui.fetchError = null;
      }

      const data = resp.data;
      ui.metrics = data.metrics;
      ui.name = data.name;

      ui.statuses = data.status.statuses;

      const overall = data.status.overall;
      if (!ui.serverState || (ui.serverState !== overall.state)) {
        ui.serverState = overall.state;
        ui.serverStateMessage = overall.title;
      }
    })
    .catch(function () {
      if (ui.fetchError) return;
      ui.fetchError = notify.error('Failed to request server ui. Perhaps your server is down?');
      ui.metrics = ui.statuses = ui.overall = null;
    })
    .then(function () {
      ui.loading = false;
    });
  };

  ui.refresh();
});

uiModules.get('kibana')
.config(function (appSwitcherEnsureNavigationProvider) {
  appSwitcherEnsureNavigationProvider.forceNavigation(true);
});
