import { uiModules } from 'ui/modules';
import 'ui/getting_started/opt_out_directive';
import { GettingStartedRegistryProvider } from 'ui/getting_started/registry';
import { GETTING_STARTED_REGISTRY_TYPES } from 'ui/getting_started/constants';
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

  const registry = Private(GettingStartedRegistryProvider);

  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'gettingStarted',
    controller: class GettingStartedController {
      constructor() {
        const registeredTopMessages = registry.byType[GETTING_STARTED_REGISTRY_TYPES.TOP_MESSAGE] || [];
        this.topMessages = registeredTopMessages.map(item => item.template);

        const registeredManageAndMonitorMessages = registry.byType[GETTING_STARTED_REGISTRY_TYPES.MANAGE_AND_MONITOR_MESSAGE] || [];
        this.manageAndMonitorMessages = registeredManageAndMonitorMessages.map(item => item.template);

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
