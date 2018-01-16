import uiRoutes from 'ui/routes';
import template from './testbed.html';

uiRoutes.when('/testbed', {
  template: template,
  controllerAs: 'testbed',
  controller: class TestbedController {
    constructor() {
    }
  }
});
