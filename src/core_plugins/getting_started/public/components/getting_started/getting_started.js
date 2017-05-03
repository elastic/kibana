import { uiModules } from 'ui/modules';
import template from './getting_started.html';
import './getting_started.less';

import kibanaLogo from 'ui/images/logo-kibana-small.svg';
import beatsLogo from 'ui/images/logo-beats-small.svg';
import logstashLogo from 'ui/images/logo-logstash-small.svg';

const app = uiModules.get('kibana');

app.directive('gettingStarted', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'gettingStarted',
    controller: class GettingStartedController {
      constructor() {
        this.manageAndMonitorItems = [
          'foo bar.',
          'baz qux quux'
        ];

        this.logoUrls = {
          kibana: kibanaLogo,
          beats: beatsLogo,
          logstash: logstashLogo
        };
      }

      get hasManageAndMonitorItems() {
        return this.manageAndMonitorItems.length > 0;
      }
    }
  };
});
