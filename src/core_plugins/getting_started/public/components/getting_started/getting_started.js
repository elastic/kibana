import { uiModules } from 'ui/modules';
import uiChrome from 'ui/chrome';
import 'ui/storage';
import 'ui/filters/trust_as_html';
import 'ui/getting_started/opt_out_directive';
import { getTopMessage, getManageAndMonitorMessages } from 'ui/getting_started/registry';
import { hasOptedOutOfGettingStarted, optOutOfGettingStarted } from 'ui/getting_started/opt_out_service';
import { documentationLinks } from 'ui/documentation_links';
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
        const topMessage = getTopMessage();
        if (topMessage) {
          const topMessageContainer = document.getElementById('gettingStartedTopMessageContainer');
          const topMessageHtml = $compile(makeAngularParseableExpression(topMessage))($scope);
          angular.element(topMessageContainer).append(topMessageHtml);
        }

        // Compile manageAndMonitorMessages and inject them into DOM
        const manageAndMonitorMessages = getManageAndMonitorMessages();
        if (manageAndMonitorMessages.length > 0) {
          const manageAndMonitorMessagesContainer = document.getElementById('gettingStartedManageAndMonitorMessagesContainer');
          manageAndMonitorMessages.forEach(message => {
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
        return getManageAndMonitorMessages().length > 0;
      }

      hasOptedOut = hasOptedOutOfGettingStarted;

      optOut = optOutOfGettingStarted;
    }
  };
});
