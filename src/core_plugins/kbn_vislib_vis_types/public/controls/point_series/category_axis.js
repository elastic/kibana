import { uiModules } from 'ui/modules';
import vislibValueAxesTemplate from './category_axis.html';
const module = uiModules.get('kibana');

module.directive('vislibCategoryAxis', function () {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      $scope.rotateOptions = [
        { name: 'horizontal', value: 0 },
        { name: 'vertical', value: 90 },
        { name: 'angled', value: 75 },
      ];
    }
  };
});
