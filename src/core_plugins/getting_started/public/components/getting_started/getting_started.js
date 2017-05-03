import { uiModules } from 'ui/modules';
import template from './getting_started.html';
import './getting_started.less';
import 'ui/storage';
// import { gettingStartedRegistry } from 'ui/getting_started_registry';

import kibanaLogo from 'ui/images/logo-kibana-small.svg';
import beatsLogo from 'ui/images/logo-beats-small.svg';
import logstashLogo from 'ui/images/logo-logstash-small.svg';
import dashboardIcon from 'ui/images/icon-dashboard.svg';
import shieldIcon from 'ui/images/icon-shield.svg';

const app = uiModules.get('kibana');

const GETTING_STARTED_OPT_OUT = 'kibana.isGettingStartedOptedOut';

app.directive('gettingStarted', function ($injector) {

  const localStorageService = $injector.get('localStorage');

  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'gettingStarted',
    controller: class GettingStartedController {
      constructor() {
        // this.manageAndMonitorMessages = gettingStartedRegistry.manageAndMonitorMessages;
        this.manageAndMonitorMessages = [
          'Manage your <a href="">users</a> and <a href="">roles</a>.',
          'Use live <a href="">monitoring</a> for health checks.',
          'Set up <a href="">watches</a> to keep tabs on your data.'
        ].join(' ');

        this.imageUrls = {
          kibanaLogo,
          beatsLogo,
          logstashLogo,
          dashboardIcon,
          shieldIcon
        };
      }

      get hasManageAndMonitorMessages() {
        // return this.manageAndMonitorMessages.length === 0;
        return this.manageAndMonitorMessages.length > 0;
      }

      recordOptOut = () => {
        localStorageService.set(GETTING_STARTED_OPT_OUT, true);
      }
    }
  };
});
