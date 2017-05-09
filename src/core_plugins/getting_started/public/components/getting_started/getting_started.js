import { uiModules } from 'ui/modules';
import uiChrome from 'ui/chrome';
import 'ui/storage';
import 'ui/filters/trust_as_html';
import { gettingStartedRegistry } from 'ui/getting_started_registry';
import { GETTING_STARTED_OPT_OUT } from '../../lib/constants';
import angular from 'angular';

import kibanaLogo from 'ui/images/logo-kibana-small.svg';
import beatsLogo from 'ui/images/logo-beats-small.svg';
import logstashLogo from 'ui/images/logo-logstash-small.svg';
import dashboardIcon from 'ui/images/icon-dashboard.svg';
import shieldIcon from 'ui/images/icon-shield.svg';

import template from './getting_started.html';
import './getting_started.less';

const app = uiModules.get('kibana');

app.directive('gettingStarted', function ($injector) {

  const localStorageService = $injector.get('localStorage');
  const $compile = $injector.get('$compile');

  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'gettingStarted',
    controller: class GettingStartedController {
      constructor($scope) {
        if (this.hasOptedOut()) {
          uiChrome.setVisible(true);
        } else {
          uiChrome.setVisible(false);
        }

        // Compile topMessageHtml and inject it into the DOM
        const topMessageContainer = document.getElementById('gettingStartedTopMessageContainer');
        const topMessageHtml = $compile(gettingStartedRegistry.topMessage)($scope);
        angular.element(topMessageContainer).append(topMessageHtml);

        this.manageAndMonitorMessages = gettingStartedRegistry.manageAndMonitorMessages.join(' ');
        this.imageUrls = {
          kibanaLogo,
          beatsLogo,
          logstashLogo,
          dashboardIcon,
          shieldIcon
        };
      }

      hasManageAndMonitorMessages = () => {
        return this.manageAndMonitorMessages.length > 0;
      }

      hasOptedOut = () => {
        return localStorageService.get(GETTING_STARTED_OPT_OUT) || false;
      }

      recordOptOut = () => {
        localStorageService.set(GETTING_STARTED_OPT_OUT, true);
        uiChrome.setVisible(true);
      }
    }
  };
});
