import { uiModules } from 'ui/modules';
import template from './getting_started.html';
import './getting_started.less';

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
      }

      get hasManageAndMonitorItems() {
        return this.manageAndMonitorItems.length > 0;
      }
    }
  };
});
