import _ from 'lodash';
import { notify } from 'ui/notify';
import 'ui/autoload/styles';
import './status_page_metric';
import './status_page.less';
import { uiModules } from 'ui/modules';


const chrome = require('ui/chrome')
  .setRootTemplate(require('plugins/status_page/status_page.html'))
  .setRootController('ui', function ($http, buildNum, buildSha) {
    const ui = this;
    ui.loading = false;

    ui.buildInfo = {
      num: buildNum,
      sha: buildSha.substr(0, 8)
    };

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
          const metrics = data.metrics;
          if (metrics) {
            ui.metrics = [{
              name: 'Heap Total',
              value: _.get(metrics, 'process.mem.heap_max_in_bytes'),
              type: 'byte'
            }, {
              name: 'Heap Used',
              value: _.get(metrics, 'process.mem.heap_used_in_bytes'),
              type: 'byte'
            }, {
              name: 'Load',
              value: [
                _.get(metrics, 'os.cpu.load_average.1m'),
                _.get(metrics, 'os.cpu.load_average.5m'),
                _.get(metrics, 'os.cpu.load_average.15m')
              ],
              type: 'float'
            }, {
              name: 'Response Time Avg',
              value: _.get(metrics, 'response_times.avg_in_millis'),
              type: 'ms'
            }, {
              name: 'Response Time Max',
              value: _.get(metrics, 'response_times.max_in_millis'),
              type: 'ms'
            }, {
              name: 'Requests Per Second',
              value: _.get(metrics, 'requests.total') * 1000 / _.get(metrics, 'collection_interval_in_millis')
            }];
          }

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
