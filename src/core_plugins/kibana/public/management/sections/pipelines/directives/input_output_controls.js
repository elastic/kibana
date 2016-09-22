import _ from 'lodash';
import uiModules from 'ui/modules';
import '../styles/_input_output_controls.less';
import template from '../views/input_output_controls.html';

const app = uiModules.get('kibana');

app.directive('inputOutputControls', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      options: '='
    },
    controller: function ($scope) {
      const defaults = {
        showMeta: false,
        showChanges: true,
        expandLevel: 1,
        minExpandLevel: 1,
        maxExpandLevel: 2,
        enableShowChanges: true,
        enableExpand: true
      };

      $scope.options = $scope.options || {};
      $scope.options = _.defaults($scope.options, defaults);
    }
  };
});
