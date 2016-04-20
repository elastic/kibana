import uiModules from 'ui/modules';
import jsondiffpatch from '@bigfunger/jsondiffpatch';
import '../styles/_output_preview.less';
import outputPreviewTemplate from '../views/output_preview.html';

const htmlFormat = jsondiffpatch.formatters.html.format;
const app = uiModules.get('kibana');

app.directive('outputPreview', function () {
  return {
    restrict: 'E',
    template: outputPreviewTemplate,
    scope: {
      oldObject: '=',
      newObject: '=',
      error: '='
    },
    link: function ($scope, $el) {
      const div = $el.find('.visual')[0];

      $scope.diffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        },
        textDiff: {
          minLength: 120
        }
      });

      $scope.updateUi = function () {
        let left = $scope.oldObject;
        let right = $scope.newObject;
        let delta = $scope.diffpatch.diff(left, right);
        if (!delta || $scope.error) delta = {};

        div.innerHTML = htmlFormat(delta, left);
      };
    },
    controller: function ($scope, debounce) {
      $scope.collapsed = false;

      const updateOutput = debounce(function () {
        $scope.updateUi();
      }, 200);

      $scope.$watch('oldObject', updateOutput);
      $scope.$watch('newObject', updateOutput);
    }
  };
});
