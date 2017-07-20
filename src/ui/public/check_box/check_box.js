import { uiModules } from 'ui/modules';
import template from './check_box.html';

const app = uiModules.get('kibana');

app.directive('checkBox', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      id: '=',
      isSelected: '=',
      onSelectChange: '=',
    },
    controllerAs: 'checkBox',
    bindToController: true,
    controller: class CheckBoxController {
    }
  };
});
