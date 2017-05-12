import { uiModules } from 'ui/modules';
import template from './blahblah.html';

const app = uiModules.get('kibana');

app.directive('blahblah', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {},
    controller: ($scope) => {
      $scope.testClick = () => {
        alert(`I'm doing something important!`);
        console.log($scope);
      };
    }
  };
});
