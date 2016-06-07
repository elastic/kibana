import uiModules from 'ui/modules';
const app = uiModules.get('kibana');

app.directive('setFocus', function ($timeout) {
  return {
    restrict: 'A',
    link: function ($scope, $element) {
      $timeout(() => {
        $element[0].focus();
      });
    }
  };
});
