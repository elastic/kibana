import uiRoutes from 'ui/routes';
import template from './testbed.html';
import './testbed.less';

import 'ui/table_info';

uiRoutes.when('/testbed', {
  template: template,
  controllerAs: 'testbed',
  controller: class TestbedController {
    constructor() {
    }
  }
});