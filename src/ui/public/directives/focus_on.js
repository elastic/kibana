import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('focusOn', ($timeout) => ({
  restrict: 'A',
  link: function (scope, elem, attrs) {
    scope.$on(attrs.focusOn, () => {
      $timeout(() => {
        return elem.find('input,select')
          .addBack('input,select')
          .focus();
      });
    });
  }
}));
