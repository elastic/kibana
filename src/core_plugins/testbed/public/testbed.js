import uiRoutes from 'ui/routes';
import template from './testbed.html';
import './testbed.less';

import 'ui/sortable_column';

uiRoutes.when('/testbed', {
  template: template,
  controllerAs: 'testbed',
  controller: class TestbedController {
    constructor($scope, $injector) {

      const $filter = $injector.get('$filter');
      this.orderBy = $filter('orderBy');

      this.items = [
        { firstName: 'Jim', lastName: 'Unger' },
        { firstName: 'CJ', lastName: 'Cenizal' },
        { firstName: 'Shaunak', lastName: 'Kashyap' }
      ];

      // Initial sort state for the table
      this.sortField = 'lastName';
      this.sortReverse = false;

      $scope.$watchGroup([
        'testbed.sortField',
        'testbed.sortReverse'
      ], this.calculateItems);
    }

    onSortChange = (field, reverse) => {
      this.sortField = field;
      this.sortReverse = reverse;
    };

    calculateItems = () => {
      this.items = this.orderBy(this.items, this.sortField, this.sortReverse);
    }
  }
});