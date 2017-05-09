import uiRoutes from 'ui/routes';
import template from './testbed.html';
import './testbed.less';

import 'ui/selectable_row';

uiRoutes.when('/testbed', {
  template: template,
  controllerAs: 'testbed',
  controller: class TestbedController {
    constructor() {
      this.myItems = [
        { id: 1, name: 'foo', isSelected: false },
        { id: 17, name: 'bar', isSelected: true },
        { id: 23, name: 'baz', isSelected: false }
      ];
    }

    onSelectChange = (itemId, newIsSelected) => {
      const foundItem = this.myItems.find((item) => item.id === itemId);
      if (!foundItem) {
        return;
      }

      this.message = `Setting isSelected = ${newIsSelected} for ${foundItem.name}`;
    }
  }
});