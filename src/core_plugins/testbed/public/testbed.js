import uiRoutes from 'ui/routes';
import template from './testbed.html';
import './testbed.less';

import 'ui/sortable_column';

uiRoutes.when('/testbed', {
  template: template,
  controllerAs: 'testbed',
  controller: class TestbedController {
    constructor() {
    }
  }
});