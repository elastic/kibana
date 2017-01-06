import uiModules from 'ui/modules';
import contextLoadingButtonTemplate from './loading_button.html';
import './loading_button.less';


const module = uiModules.get('apps/context', [
  'kibana',
  'ngRoute',
]);

module.directive('contextLoadingButton', function ContextLoadingButton() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      disabled: '=',
      icon: '=',
    },
    template: contextLoadingButtonTemplate,
    transclude: true,
  };
});
