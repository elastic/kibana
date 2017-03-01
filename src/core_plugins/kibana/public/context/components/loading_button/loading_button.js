import uiModules from 'ui/modules';
import contextLoadingButtonTemplate from './loading_button.html';


const module = uiModules.get('apps/context', [
  'kibana',
  'ngRoute',
]);

module.directive('contextLoadingButton', function ContextLoadingButton() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      isDisabled: '=',
      icon: '=',
    },
    template: contextLoadingButtonTemplate,
    transclude: true,
  };
});
