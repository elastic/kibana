import { uiModules } from 'ui/modules';
import uiChrome from 'ui/chrome';
import 'ui/storage';
import 'ui/filters/trust_as_html';
import { gettingStartedRegistry } from 'ui/getting_started_registry';
import { documentationLinks } from 'ui/documentation_links';
import { GETTING_STARTED_OPT_OUT } from '../../lib/constants';
import angular from 'angular';

import kibanaLogo from 'ui/images/logo-kibana-small.svg';
import beatsLogo from 'ui/images/logo-beats-small.svg';
import logstashLogo from 'ui/images/logo-logstash-small.svg';
import dashboardIcon from 'ui/images/icon-dashboard.svg';
import shieldIcon from 'ui/images/icon-shield.svg';

import template from './getting_started.html';
import './getting_started.less';

function makeAngularParseableExpression(text) {
  return `<span>${text}</span>`;
}

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
        if (gettingStartedRegistry.topMessage) {
          const topMessageContainer = document.getElementById('gettingStartedTopMessageContainer');
          const topMessageHtml = $compile(makeAngularParseableExpression(gettingStartedRegistry.topMessage))($scope);
          angular.element(topMessageContainer).append(topMessageHtml);
        }

        // Compile manageAndMonitorMessages and inject them into DOM
        if (gettingStartedRegistry.manageAndMonitorMessages.length > 0) {
          const manageAndMonitorMessagesContainer = document.getElementById('gettingStartedManageAndMonitorMessagesContainer');
          gettingStartedRegistry.manageAndMonitorMessages.forEach(message => {
            const paddedMessage = `${message}&nbsp;`;
            const messageHtml = $compile(makeAngularParseableExpression(paddedMessage))($scope);
            angular.element(manageAndMonitorMessagesContainer).append(messageHtml);
          });
        }

        this.imageUrls = {
          kibanaLogo,
          beatsLogo,
          logstashLogo,
          dashboardIcon,
          shieldIcon
        };
        this.documentationLinks = documentationLinks;
      }

      hasManageAndMonitorMessages = () => {
        return gettingStartedRegistry.manageAndMonitorMessages.length > 0;
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
