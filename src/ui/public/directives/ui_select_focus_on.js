import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('uiSelectFocusOn', ($timeout) => ({
  restrict: 'A',
  require: 'uiSelect',
  link: function (scope, elem, attrs, uiSelect) {
    scope.$on(attrs.uiSelectFocusOn, () => {
      $timeout(() => uiSelect.activate());
    });
  }
}));
