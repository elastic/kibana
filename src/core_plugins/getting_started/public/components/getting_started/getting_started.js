import { uiModules } from 'ui/modules';
import uiChrome from 'ui/chrome';
import 'ui/filters/trust_as_html';
import 'ui/getting_started/opt_out_directive';
import { GettingStartedTopMessagesRegistryProvider } from 'ui/getting_started/top_messages_registry';
import { GettingStartedMonitorAndManageMessagesRegistryProvider } from 'ui/getting_started/monitor_and_manage_messages_registry';
import { hasOptedOutOfGettingStarted } from 'ui/getting_started/opt_out_helpers';
import { documentationLinks } from 'ui/documentation_links';

import kibanaLogo from 'ui/images/logo-kibana-small.svg';
import beatsLogo from 'ui/images/logo-beats-small.svg';
import logstashLogo from 'ui/images/logo-logstash-small.svg';
import dashboardIcon from 'ui/images/icon-dashboard.svg';
import shieldIcon from 'ui/images/icon-shield.svg';

import template from './getting_started.html';
import './getting_started.less';
import '../injected_items';

const app = uiModules.get('kibana');

app.directive('gettingStarted', function ($injector) {
  const Private = $injector.get('Private');

  const topMessagesRegistry = Private(GettingStartedTopMessagesRegistryProvider);
  const manageAndMonitorMessagesRegistry = Private(GettingStartedMonitorAndManageMessagesRegistryProvider);

  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'gettingStarted',
    controller: class GettingStartedController {
      constructor() {
        if (this.hasOptedOut()) {
          uiChrome.setVisible(true);
        } else {
          uiChrome.setVisible(false);
        }

        this.topMessages = topMessagesRegistry.raw.map(item => item.template);
        this.manageAndMonitorMessages = manageAndMonitorMessagesRegistry.raw.map(item => item.template);

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
        return this.manageAndMonitorMessages.length > 0;
      }

      hasOptedOut = hasOptedOutOfGettingStarted;
    }
  };
});
