import { uiModules } from '../modules';
const module = uiModules.get('kibana');

module.directive('inputFocus', function ($parse, $timeout) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      const isDisabled = attrs.disableInputFocus && $parse(attrs.disableInputFocus)($scope);
      if (!isDisabled) {
        $timeout(function () {
          $elem.focus();
          if (attrs.inputFocus === 'select') $elem.select();
        });
      }
    }
  };
});
